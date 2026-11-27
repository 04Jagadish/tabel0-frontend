import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'

const accountIdPattern = /^[a-f0-9]{32}$/i
const resourceIdPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
const emailPattern = /^[a-z0-9.!#$%&'+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i
const hostnamePattern = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/
const policyFields = [
  'name', 'decision', 'include', 'exclude', 'require', 'precedence',
  'approval_groups', 'approval_required', 'connection_rules', 'isolation_required',
  'mfa_config', 'purpose_justification_prompt', 'purpose_justification_required',
  'session_duration',
]
const metadataFields = [
  'id', 'account_id', 'policy_resolution_account_id', 'created_at', 'updated_at', 'reusable',
]

function policySettings(policy) {
  const unknownFields = Object.keys(policy).filter(
    key => !policyFields.includes(key) && !metadataFields.includes(key),
  )
  if (unknownFields.length) {
    throw new Error(`Review unsupported policy fields in Cloudflare: ${unknownFields.join(', ')}.`)
  }
  return Object.fromEntries(policyFields
    .filter(key => policy[key] !== undefined && policy[key] !== null)
    .map(key => [key, policy[key]]))
}

function canonicalJson(value) {
  return JSON.stringify(value, (_, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)))
  })
}

export async function runAccessAgent({
  action, hostname, email, appId, policyId, approval,
  accountId, token, request = fetch, log = console.log,
}) {
  if (!['plan', 'apply'].includes(action) || !hostnamePattern.test(hostname ?? '') ||
      !emailPattern.test(email ?? '') || !resourceIdPattern.test(appId ?? '') ||
      !resourceIdPattern.test(policyId ?? '')) {
    throw new Error('Usage: access:agent -- <plan|apply> <hostname> <email> <app-id> <policy-id> [approval-hash]')
  }
  if (action === 'apply' && !/^[a-f0-9]{64}$/.test(approval ?? '')) {
    throw new Error('Apply requires the approval hash printed by plan.')
  }
  if (!accountIdPattern.test(accountId ?? '') || !token?.trim()) {
    throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the operator environment.')
  }

  async function call(path, method = 'GET', body) {
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.success !== true || !data.result) {
      const codes = data?.errors?.map(error => error.code).filter(Number.isInteger).join(', ')
      throw new Error(`Cloudflare ${method} failed with HTTP ${response.status}${codes ? ` (codes ${codes})` : ''}.`)
    }
    return data.result
  }

  const appPath = `/access/apps/${appId}`
  const policyPath = `${appPath}/policies/${policyId}`
  const app = await call(appPath)
  if (app.id !== appId || app.type !== 'self_hosted' || app.domain !== hostname ||
      app.destinations?.some(destination =>
        destination.type !== 'public' || destination.uri !== hostname) ||
      app.self_hosted_domains?.some(domain => domain !== hostname)) {
    throw new Error('Select a self-hosted Access application scoped to exactly the requested hostname.')
  }
  const policy = await call(policyPath)
  if (policy.id !== policyId || policy.reusable === true ||
      (policy.policy_resolution_account_id && policy.policy_resolution_account_id !== accountId) ||
      policy.decision !== 'allow' || !Array.isArray(policy.include) || !policy.include.length ||
      !policy.include.every(rule =>
        Object.keys(rule).length === 1 && typeof rule.email?.email === 'string')) {
    throw new Error('Select an application-specific Allow policy whose Include rules match individual emails.')
  }

  const target = { hostname, appId, policyId, policyName: policy.name, email }
  if (policy.include.some(rule => rule.email.email.toLowerCase() === email.toLowerCase())) {
    log({ event: 'already-included', ...target, message: 'Check Require/Exclude rules, policy order, and the selected identity provider.' })
    return
  }

  const before = policySettings(policy)
  const after = { ...before, include: [...before.include, { email: { email } }] }
  const approvalHash = createHash('sha256').update(
    canonicalJson({ accountId, target, app, policy, after }),
  ).digest('hex')

  if (action === 'plan') {
    log({ event: 'proposal', ...target, change: 'Append one email Include rule', approvalHash })
    return
  }
  if (approval !== approvalHash) {
    throw new Error('The target or Cloudflare configuration changed. Generate and review a new plan.')
  }

  log({ event: 'applying', ...target, approvalHash })
  try {
    await call(policyPath, 'PUT', after)
    const verified = await call(policyPath)
    if (verified.id !== policyId || !isDeepStrictEqual(policySettings(verified), after)) {
      throw new Error('Policy read-back differs from the approved proposal.')
    }
  } catch (error) {
    throw new Error(`${error.message} Inspect the live policy before retrying.`)
  }
  log({ event: 'verified', ...target, approvalHash })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [action, hostname, email, appId, policyId, approval] = process.argv.slice(2)
  try {
    await runAccessAgent({
      action, hostname, email, appId, policyId, approval,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_API_TOKEN,
      log: event => console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...event })),
    })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

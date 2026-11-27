import assert from 'node:assert/strict'
import test from 'node:test'
import { runAccessAgent } from './access-agent.mjs'

const appId = '10000000-0000-0000-0000-000000000001'
const policyId = '10000000-0000-0000-0000-000000000002'
const hostname = 'example.test'
const email = 'new@example.test'

function setup(overrides = {}) {
  let policy = {
    id: policyId,
    name: 'Approved operators',
    decision: 'allow',
    include: [{ email: { email: 'old@example.test' } }],
    exclude: [],
    require: [{ login_method: { id: 'google' } }],
    precedence: 1,
    mfa_config: { allowed_authenticators: ['totp'] },
    ...overrides,
  }
  const events = []
  const writes = []
  const run = (action, approval) => runAccessAgent({
    action, approval, hostname, email, appId, policyId,
    accountId: '1'.repeat(32),
    token: 'test-token',
    log: event => events.push(event),
    request: async (url, { method, body }) => {
      if (url.endsWith(`/apps/${appId}`)) {
        assert.equal(method, 'GET')
        return Response.json({ success: true, result: { id: appId, type: 'self_hosted', domain: hostname } })
      }
      assert.ok(url.endsWith(`/apps/${appId}/policies/${policyId}`))
      if (method === 'PUT') {
        const payload = JSON.parse(body)
        writes.push(payload)
        policy = { id: policyId, ...payload }
      }
      return Response.json({ success: true, result: policy })
    },
  })
  return { run, events, writes, changePolicy: changes => { policy = { ...policy, ...changes } } }
}

test('plans read-only, then appends one address and verifies policy protections', async () => {
  const { run, events, writes } = setup()
  await run('plan')
  assert.equal(writes.length, 0)
  await run('apply', events[0].approvalHash)
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].include.map(rule => rule.email.email), ['old@example.test', email])
  assert.deepEqual(writes[0].mfa_config, { allowed_authenticators: ['totp'] })
  assert.deepEqual(writes[0].require, [{ login_method: { id: 'google' } }])
  assert.equal(writes[0].precedence, 1)
  assert.equal(events.at(-1).event, 'verified')
  await run('plan')
  assert.equal(events.at(-1).event, 'already-included')
})

test('refuses stale approval and policies with unsupported rules or settings', async () => {
  const { run, events, writes, changePolicy } = setup()
  await run('plan')
  changePolicy({ exclude: [{ email: { email: 'excluded@example.test' } }] })
  await assert.rejects(run('apply', events[0].approvalHash), /changed/)
  changePolicy({ include: [{ everyone: {} }] })
  await assert.rejects(run('plan'), /individual emails/)
  changePolicy({ include: [{ email: { email: 'old@example.test' } }], future_setting: true })
  await assert.rejects(run('plan'), /unsupported policy fields/)
  assert.equal(writes.length, 0)
})

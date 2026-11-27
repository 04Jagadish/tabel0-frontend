import { createRemoteJWKSet, jwtVerify } from 'jose'

const keySets = new Map()

function accessResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export default {
  async fetch(request, env) {
    const issuer = env.ACCESS_TEAM_DOMAIN
    const audience = env.ACCESS_AUDIENCE

    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience?.trim()) {
      return accessResponse('Access configuration is unavailable.', 503)
    }

    const token = request.headers.get('Cf-Access-Jwt-Assertion')
    if (!token) {
      return accessResponse('Access denied.', 403)
    }

    if (!keySets.has(issuer)) {
      keySets.set(issuer, createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer)))
    }

    try {
      const { payload } = await jwtVerify(token, keySets.get(issuer), {
        algorithms: ['RS256'],
        issuer,
        audience,
        requiredClaims: ['exp', 'sub', 'type'],
      })
      if (payload.type !== 'app' || !payload.sub || typeof payload.email !== 'string' || !payload.email) {
        return accessResponse('Access denied.', 403)
      }
    } catch {
      return accessResponse('Access denied.', 403)
    }

    const asset = await env.ASSETS.fetch(request)
    const response = new Response(asset.body, asset)
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Frame-Options', 'DENY')
    return response
  },
}

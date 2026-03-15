async function verifyAdminToken(cookie, secret) {
  if (!cookie || !secret) return false
  const match = cookie.match(/admin_token=([^;]+)/)
  if (!match) return false
  const token = match[1]
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expected)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return sig === expectedSig
}

export async function onRequest(context) {
  const { request, env, next } = context
  const url = new URL(request.url)

  // Allow login page and login POST without auth
  if (url.pathname === '/admin/login') return next()

  const cookie = request.headers.get('cookie') || ''
  const secret = env.ADMIN_SECRET || env.ADMIN_PASSWORD
  const authed = await verifyAdminToken(cookie, secret)

  if (!authed) {
    if (request.method === 'GET') {
      return new Response(null, { status: 302, headers: { Location: '/admin/login' } })
    }
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  return next()
}

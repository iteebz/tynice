async function signToken(secret) {
  const payload = crypto.randomUUID()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${payload}.${sigStr}`
}

export async function onRequestPost(context) {
  const { request, env } = context
  let password
  try {
    password = (await request.json()).password
  } catch {
    password = null
  }

  const adminPassword = env.ADMIN_PASSWORD
  if (!adminPassword || password !== adminPassword) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const secret = env.ADMIN_SECRET || adminPassword
  const token = await signToken(secret)

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `admin_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
    },
  })
}

export async function onRequestGet(context) {
  return context.env.ASSETS.fetch(new Request(new URL('/admin-login.html', context.request.url)))
}

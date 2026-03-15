export async function onRequestPost(context) {
  const { request, env } = context
  const password = env.SITE_PASSWORD || ''

  const body = await request.text()
  const params = new URLSearchParams(body)

  if (params.get('password')?.toLowerCase().trim() === password.toLowerCase()) {
    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': 'auth=authed; Path=/; HttpOnly; SameSite=Strict',
        Location: '/',
      },
    })
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/login?error=1' },
  })
}

export async function onRequestGet(context) {
  // Let Pages serve the static login.html from public/
  return context.env.ASSETS.fetch(new Request(new URL('/login.html', context.request.url)))
}

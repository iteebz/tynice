export async function onRequest(context) {
  const { request, env, next } = context
  const url = new URL(request.url)
  const password = env.SITE_PASSWORD

  if (!password) return next()

  // Always allow login route
  if (url.pathname === '/login') return next()

  // Allow static login page assets
  if (url.pathname === '/login.css' || url.pathname === '/login.html') return next()

  // Check auth cookie
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/auth=([^;]+)/)
  if (match && match[1] === 'authed') return next()

  // Serve login page for HTML requests, redirect otherwise
  if (url.pathname === '/') {
    return new Response(null, { status: 302, headers: { Location: '/login' } })
  }

  return new Response(null, { status: 302, headers: { Location: '/login' } })
}

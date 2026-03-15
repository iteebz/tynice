export async function onRequestGet(context) {
  return context.env.ASSETS.fetch(new Request(new URL('/admin.html', context.request.url)))
}

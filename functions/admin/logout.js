export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'admin_token=; HttpOnly; Path=/; Max-Age=0',
    },
  })
}

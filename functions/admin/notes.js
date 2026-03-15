function supabaseHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export async function onRequestGet(context) {
  const { env } = context
  if (!env.SUPABASE_URL) return Response.json({ error: 'supabase not configured' }, { status: 500 })

  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/notes?order=created_at.desc&limit=100`, {
      headers: supabaseHeaders(env),
    })
    const notes = await r.json()
    return Response.json(notes)
  } catch (err) {
    console.error('Notes fetch error:', err)
    return Response.json({ error: 'fetch failed' }, { status: 500 })
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context
  if (!env.SUPABASE_URL) return Response.json({ error: 'supabase not configured' }, { status: 500 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: supabaseHeaders(env),
    })
    return Response.json(r.ok ? { ok: true } : { error: 'delete failed' }, { status: r.ok ? 200 : 500 })
  } catch (err) {
    console.error('Note delete error:', err)
    return Response.json({ error: 'delete failed' }, { status: 500 })
  }
}

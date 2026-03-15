import { deleteObject } from '../../lib/r2.js'
import { deleteVideo } from '../../lib/stream.js'

export async function onRequestDelete(context) {
  const url = new URL(context.request.url)
  const key = url.searchParams.get('key')
  const type = url.searchParams.get('type')
  if (!key) return Response.json({ error: 'key required' }, { status: 400 })

  try {
    if (type === 'video') {
      await deleteVideo(context.env, key)
    } else {
      await deleteObject(context.env, key)
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('Delete error:', err)
    return Response.json({ error: 'delete failed' }, { status: 500 })
  }
}

import { fetchGallery } from '../lib/r2.js'
import { listVideos } from '../lib/stream.js'

export async function onRequestGet(context) {
  const [images, videos] = await Promise.all([
    fetchGallery(context.env),
    listVideos(context.env).catch(() => []),
  ])

  const items = [...(images.items || []), ...videos]
  items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))

  return Response.json({ items, count: items.length })
}

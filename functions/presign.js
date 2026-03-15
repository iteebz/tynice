import { generatePresignedUrl, isImageType } from '../lib/r2.js'
import { createDirectUpload } from '../lib/stream.js'

const VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm', 'video/mov',
])

const UNSUPPORTED_TYPES = new Set(['image/heic', 'image/heif'])
const MAX_SIZE_BYTES = 500 * 1024 * 1024

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const filename = url.searchParams.get('filename')
  const type = url.searchParams.get('type') || 'video/mp4'
  const size = Number(url.searchParams.get('size') || 0)

  if (!filename) return Response.json({ error: 'filename required' }, { status: 400 })

  if (UNSUPPORTED_TYPES.has(type)) {
    return Response.json({
      error: "HEIC photos can't display in browsers — on your iPhone go to Settings → Camera → Formats → Most Compatible, then re-export",
    }, { status: 415 })
  }

  if (size > MAX_SIZE_BYTES) {
    return Response.json({ error: 'File exceeds 500MB limit' }, { status: 413 })
  }

  if (!VIDEO_TYPES.has(type) && !isImageType(type)) {
    return Response.json({ error: 'File type not allowed' }, { status: 415 })
  }

  try {
    // Try Stream for videos if configured
    if (VIDEO_TYPES.has(type) && context.env.CLOUDFLARE_API_TOKEN) {
      const { uploadUrl, uid } = await createDirectUpload(context.env)
      return Response.json({ url: uploadUrl, key: uid, method: 'POST', stream: true })
    }

    // Fall back to R2 for everything (images always, videos if Stream not enabled)
    const data = await generatePresignedUrl(context.env, filename, type, size)
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

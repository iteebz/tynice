const ACCOUNT_ID = '5b1295e874631bb6d428fc7a75806e6e'

function streamApi(env, path, opts = {}) {
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      ...opts.headers,
    },
  })
}

export async function createDirectUpload(env, maxDurationSeconds = 300) {
  const res = await streamApi(env, '/direct_upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: false,
    }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Stream upload creation failed')
  return { uploadUrl: data.result.uploadURL, uid: data.result.uid }
}

export async function listVideos(env) {
  const res = await streamApi(env, '?per_page=100&status=ready')
  const data = await res.json()
  if (!data.success) return []
  return data.result.map((v) => ({
    key: v.uid,
    name: v.meta?.filename || v.uid,
    size: v.size,
    lastModified: v.uploaded,
    duration: v.duration,
    thumbnailUrl: v.thumbnail,
    openUrl: v.preview,
    playback: v.playback?.hls,
    type: 'video',
  }))
}

export async function deleteVideo(env, uid) {
  const res = await streamApi(env, `/${uid}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Stream delete failed')
}

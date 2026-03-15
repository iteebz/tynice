import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getS3(env) {
  return new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

export async function fetchGallery(env) {
  const bucket = env.R2_BUCKET
  const publicUrl = env.R2_PUBLIC_URL || 'https://pub-fe7625b2c4df4b5aa7c637299e6a569a.r2.dev'
  if (!bucket) return { items: [], count: 0 }

  try {
    const s3 = getS3(env)
    const data = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 100 }))
    const contents = data.Contents || []

    const items = await Promise.all(
      contents.map(async (obj) => {
        const key = obj.Key || ''
        let url = ''

        if (publicUrl) {
          url = `${publicUrl}/${key}`
        } else {
          url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 })
        }

        return {
          key,
          name: key.split('/').pop(),
          size: obj.Size,
          lastModified: obj.LastModified,
          thumbnailUrl: url,
          openUrl: url,
          type: 'image',
        }
      }),
    )

    items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    return { items, count: contents.length }
  } catch (error) {
    console.error('R2 list error:', error)
    return { items: [], count: 0 }
  }
}

const IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
])

const ALLOWED_TYPES = new Set([
  ...IMAGE_TYPES,
  'video/mp4', 'video/quicktime', 'video/webm', 'video/mov',
])

export function isImageType(type) {
  return IMAGE_TYPES.has(type)
}

const UNSUPPORTED_TYPES = new Set(['image/heic', 'image/heif'])
const MAX_SIZE_BYTES = 500 * 1024 * 1024

export async function generatePresignedUrl(env, filename, contentType = 'video/mp4', size = 0) {
  if (UNSUPPORTED_TYPES.has(contentType)) {
    throw Object.assign(
      new Error("HEIC photos can't display in browsers — on your iPhone go to Settings → Camera → Formats → Most Compatible, then re-export"),
      { code: 'UNSUPPORTED_TYPE' },
    )
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    throw Object.assign(new Error('File type not allowed'), { code: 'INVALID_TYPE' })
  }
  if (size > MAX_SIZE_BYTES) {
    throw Object.assign(new Error('File exceeds 500MB limit'), { code: 'TOO_LARGE' })
  }

  const ext = filename.split('.').pop()
  const safeKey = `${Date.now()}-${crypto.randomUUID()}.${ext}`

  const url = await getSignedUrl(
    getS3(env),
    new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: safeKey, ContentType: contentType }),
    { expiresIn: 3600 },
  )
  return { url, key: safeKey, method: 'PUT' }
}

export async function deleteObject(env, key) {
  await getS3(env).send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
}

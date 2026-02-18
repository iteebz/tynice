import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { existsSync } from 'fs';

if (existsSync('.env')) {
    process.loadEnvFile('.env');
}

let _s3 = null;

function getS3() {
    if (_s3) return _s3;

    const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

    _s3 = new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        forcePathStyle: true,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
    return _s3;
}

const getR2Bucket = () => process.env.R2_BUCKET || '';
const getR2PublicUrl = () => process.env.R2_PUBLIC_URL || 'https://pub-fe7625b2c4df4b5aa7c637299e6a569a.r2.dev';

export async function fetchGallery() {
    const bucket = getR2Bucket();
    const publicUrl = getR2PublicUrl();
    if (!bucket) return { items: [], count: 0 };

    const command = new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 100,
    });

    try {
        const s3 = getS3();
        const data = await s3.send(command);
        const contents = data.Contents || [];

        const items = await Promise.all(contents.map(async (obj) => {
            const key = obj.Key || '';
            let url = '';

            if (publicUrl) {
                url = `${publicUrl}/${key}`;
            } else {
                const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
                url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
            }

            return {
                key: key,
                name: key.split('/').pop(),
                size: obj.Size,
                lastModified: obj.LastModified,
                thumbnailUrl: url,
                openUrl: url,
            };
        }));

        // Sort by last modified descending
        items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        return { items, count: contents.length };
    } catch (error) {
        console.error('R2 list error:', error);
        return { items: [], count: 0 };
    }
}

export async function generatePresignedUrl(filename, contentType = 'video/mp4') {
    const bucket = getR2Bucket();
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        ContentType: contentType,
    });

    try {
        const url = await getSignedUrl(getS3(), command, { expiresIn: 3600 });
        return { url, method: 'PUT' };
    } catch (error) {
        console.error('Presign error:', error);
        throw new Error('Failed to generate presigned URL');
    }
}

export function getPublicUrl() {
    return getR2PublicUrl() || null;
}

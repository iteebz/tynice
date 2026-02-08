export interface Env {
  BUCKET: R2Bucket;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/presign' && request.method === 'GET') {
      const filename = url.searchParams.get('filename');
      const type = url.searchParams.get('type');

      if (!filename || !type) {
        return new Response(JSON.stringify({ error: 'Missing filename or type' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const key = `${Date.now()}-${crypto.randomUUID()}-${filename}`;
      
      const signedUrl = await env.BUCKET.createMultipartUpload(key);
      
      return new Response(JSON.stringify({ 
        url: `${url.origin}/upload/${key}`,
        key 
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname.startsWith('/upload/') && request.method === 'PUT') {
      const key = url.pathname.replace('/upload/', '');
      const body = await request.arrayBuffer();
      
      await env.BUCKET.put(key, body, {
        httpMetadata: {
          contentType: request.headers.get('Content-Type') || 'video/mp4',
        },
      });

      return new Response(JSON.stringify({ success: true, key }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};

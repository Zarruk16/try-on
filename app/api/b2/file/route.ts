import { NextRequest } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

let endpoint = process.env.B2_S3_ENDPOINT as string;
if (endpoint && !/^https?:\/\//i.test(endpoint)) {
  endpoint = `https://${endpoint}`;
}
const region = process.env.B2_REGION as string;
const bucket = process.env.B2_BUCKET_NAME as string;
const accessKeyId = process.env.B2_KEY_ID as string;
const secretAccessKey = process.env.B2_APPLICATION_KEY as string;

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing key parameter' }), { status: 400 });
    }

    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = res.Body as any; // Node Readable stream
    const contentType = (res.ContentType as string) || 'model/gltf-binary';
    const contentLength = res.ContentLength ? String(res.ContentLength) : undefined;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    return new Response(body as ReadableStream<any>, { headers });
  } catch (err: any) {
    console.error('B2 proxy error', err);
    return new Response(JSON.stringify({ error: err.message || 'Proxy error' }), { status: 500 });
  }
}
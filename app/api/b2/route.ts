import { NextRequest } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let endpoint = process.env.B2_S3_ENDPOINT as string; // e.g. https://s3.us-east-005.backblazeb2.com
// Add scheme if the env value omitted it
if (endpoint && !/^https?:\/\//i.test(endpoint)) {
  endpoint = `https://${endpoint}`;
}
const region = process.env.B2_REGION as string; // e.g. us-west-002
const bucket = process.env.B2_BUCKET_NAME as string;
const accessKeyId = process.env.B2_KEY_ID as string;
const secretAccessKey = process.env.B2_APPLICATION_KEY as string;

const s3 = new S3Client({
  region,
  endpoint,
  // Path style is more tolerant of bucket names with uppercase or dots
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const prefix = url.searchParams.get('prefix') || '';
    const maxKeys = Number(url.searchParams.get('max')) || 50;
    const origin = url.origin;

    const listRes = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: maxKeys })
    );

    const items = (listRes.Contents || [])
      .filter((o) => o.Key && o.Key.toLowerCase().endsWith('.glb'))
      .map((o) => ({
        key: o.Key!,
        name: o.Key!.split('/').pop()!,
        size: o.Size || 0,
        lastModified: o.LastModified?.toISOString() || null,
      }));

    // Presign each GLB for temporary access (if bucket is private)
    const signed = await Promise.all(
      items.map(async (i) => {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: i.key });
        const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 }); // 60 minutes for mobile latency
        const proxyUrl = `${origin}/api/b2/file?key=${encodeURIComponent(i.key)}`;
        return { ...i, url, proxyUrl };
      })
    );

    return new Response(JSON.stringify({ models: signed }), { status: 200 });
  } catch (err: any) {
    console.error('B2 list error', err);
    return new Response(JSON.stringify({ error: err.message || 'B2 error' }), { status: 500 });
  }
}
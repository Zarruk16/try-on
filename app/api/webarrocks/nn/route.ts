export const dynamic = 'force-dynamic';

export async function GET() {
  const cdnUrls = [
    'https://cdn.jsdelivr.net/gh/WebAR-rocks/WebAR.rocks.hand@latest/neuralNets/NN_FOOT_23.json',
    'https://raw.githubusercontent.com/WebAR-rocks/WebAR.rocks.hand/master/neuralNets/NN_FOOT_23.json'
  ];
  let response: Response | null = null;
  for (const url of cdnUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) { response = res; break; }
    } catch {}
  }
  if (!response) {
    return new Response(JSON.stringify({ error: 'Failed to fetch NN_FOOT_23.json' }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
  const text = await response.text();
  return new Response(text, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
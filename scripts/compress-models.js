// Compress GLB assets in public/model using gzip and brotli.
// Note: Serving pre-compressed files requires the server/CDN to set
// Content-Encoding based on Accept-Encoding. Vercel and many CDNs do this automatically.
// This script just produces .gz and .br variants alongside the originals.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dir = path.join(__dirname, '..', 'public', 'model');

function compressFile(src) {
  const data = fs.readFileSync(src);
  const gz = zlib.gzipSync(data, { level: 9 });
  const br = zlib.brotliCompressSync(data, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  });
  fs.writeFileSync(src + '.gz', gz);
  fs.writeFileSync(src + '.br', br);
  console.log('Compressed', path.basename(src));
}

function run() {
  if (!fs.existsSync(dir)) {
    console.error('Model directory not found:', dir);
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
  for (const f of files) {
    const src = path.join(dir, f);
    try {
      compressFile(src);
    } catch (e) {
      console.error('Compression failed for', f, e);
    }
  }
}

run();
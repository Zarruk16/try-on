Augmented Reality Project

## Backblaze B2 Integration

This project can load `.glb` 3D models directly from a Backblaze B2 bucket by listing the bucket and generating presigned URLs via the S3-compatible API.

### Environment variables

Create `.env.local` with the following:

```
B2_S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
B2_REGION=us-west-002
B2_BUCKET_NAME=your_bucket_name
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
```

If your bucket is public and has proper CORS for your domain, you can also build public URLs instead of presigning. This project presigns by default for private buckets.

### Permissions

- Generate an Application Key in Backblaze with S3 access to your bucket (list, read). Use the key ID and application key above.
- Ensure bucket CORS allows GET from your local dev origin (e.g. `http://localhost:3000`) if not presigning, or rely on presigned URLs as implemented.

### Usage

- Start the dev server: `npm run dev` and open `http://localhost:3000`.
- The left panel lists `.glb` assets from your B2 bucket. Click one to load it in the AR scene.
- Presigned URLs expire after 15 minutes; refresh the page to regenerate.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Run In Your Phone

```bash
cloudflared tunnel --url http://localhost:3000  
```
After that the local tunnel will provide a url. click that and get the password form the link.
Which is inside the url. Example[https://ear-quantities-seat.trycloudflare.com]


import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  server: {
    host: true,
    hmr: { clientPort: 443, protocol: 'https' },
    allowedHosts: true,
    fs: { allow: [appRoot] }
  }
})

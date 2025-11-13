import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const appRoot = fileURLToPath(new URL('.', import.meta.url))
const demosBareFootAssets = path.resolve(appRoot, '../demos/bareFootVTO/assets')

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  server: {
    allowedHosts: ['discount-recreation-quest-structure.trycloudflare.com'],
    fs: { allow: [appRoot, demosBareFootAssets] }
  }
})

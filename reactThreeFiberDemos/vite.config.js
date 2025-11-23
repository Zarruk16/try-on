import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  server: {
    host: true,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  server: {
    port: 5001,
  },
  optimizeDeps: {
    // Force Vite to not pre-bundle workspace packages so changes are picked up
    exclude: ['@omega-flow/editor', '@omega-flow/types'],
  },
})

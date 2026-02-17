import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5001,
  },
  optimizeDeps: {
    // Force Vite to not pre-bundle workspace packages so changes are picked up
    exclude: ['@omega-flow/editor', '@omega-flow/types'],
  },
})

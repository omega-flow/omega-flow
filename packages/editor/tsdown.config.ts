import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  deps: {
    neverBundle: ['react', 'react-dom', '@xyflow/react'],
  },
})

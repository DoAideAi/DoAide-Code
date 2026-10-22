import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = 'http://127.0.0.1:3097'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React in its own chunk: it changes only on upgrades, so repeat visitors keep it
        // cached across deploys of our code.
        manualChunks: { vendor: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    port: 3098,
    proxy: {
      '/api': api,
      '/ws': { target: api, ws: true },
      '/sync': { target: api, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = 'http://127.0.0.1:3097'

export default defineConfig({
  plugins: [react()],
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
  },
})

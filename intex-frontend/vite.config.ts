import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev: browser calls same origin (e.g. :5173/api/...) → forwarded to the API (see launchSettings http profile).
      '/api': {
        target: 'http://localhost:5007',
        changeOrigin: true,
      },
    },
  },
})

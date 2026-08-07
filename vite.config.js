import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    // Proxy worker API calls same-origin in dev so localhost never hits CORS.
    proxy: {
      '/api': 'https://shimul-ai.shimulraj0.workers.dev',
      '/chat': 'https://shimul-ai.shimulraj0.workers.dev',
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
})

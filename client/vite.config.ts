import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Em dev, /api vai para o Express local (evita CORS).
    proxy: { '/api': 'http://localhost:3333' },
  },
})

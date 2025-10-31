import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Config compatible con ESM y Vercel
export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})

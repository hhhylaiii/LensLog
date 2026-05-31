import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src'),
    },
    dedupe: ['@tanstack/react-query', 'react', 'react-dom'],
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: 'VITE_',
    server: {
      https: env.LOCAL_CERT ? {
        cert: env.LOCAL_CERT,
        key: env.LOCAL_KEY,
      } : undefined,
      host: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  }
})

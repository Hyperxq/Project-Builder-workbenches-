/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3020,
    strictPort: true,
    fs: {
      // bench.json files live in the sibling workbench folders
      allow: ['..'],
    },
  },
  preview: {
    port: 3020,
    strictPort: true,
  },
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { aliases } from './aliases'

export default defineConfig({
  plugins: [react()],
  base: './',   // Required for Capacitor — relative paths
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: aliases,
  }
})

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { aliases } from './aliases'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: aliases,
  },
  // Without this, vitest's esbuild transform for .jsx test files falls back to the
  // classic JSX runtime (emitting bare `React.createElement` calls with no import),
  // which throws "React is not defined" since no source file in this project imports
  // React directly (they all rely on the automatic runtime configured for Vite itself).
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})

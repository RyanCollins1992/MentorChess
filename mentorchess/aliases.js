import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Shared path aliases for both Vite (app build) and Vitest (test runner),
 * so `@core`, `@store`, etc. resolve identically in both contexts.
 */
export const aliases = {
  '@': resolve(__dirname, 'src'),
  '@core': resolve(__dirname, 'src/core'),
  '@store': resolve(__dirname, 'src/store'),
  '@pages': resolve(__dirname, 'src/pages'),
  '@components': resolve(__dirname, 'src/components'),
  '@data': resolve(__dirname, 'src/data'),
  '@hooks': resolve(__dirname, 'src/hooks'),
  '@utils': resolve(__dirname, 'src/utils'),
}

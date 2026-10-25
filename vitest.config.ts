import { defineConfig } from 'vitest/config'
import { sqlRaw } from './src/vite-sql-raw.ts'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [sqlRaw()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
    setupFiles: ['tests/test-utils.tsx'],
    globals: true,
  },
})

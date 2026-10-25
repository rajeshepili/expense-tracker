import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
    setupFiles: ['tests/test-utils.tsx'],
    globals: true,
  },
})

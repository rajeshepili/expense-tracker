// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      '.output',
      '.vercel',
      'node_modules',
      'dist',
      'build',
      '*.config.js',
      '*.config.ts',
      '.cta.json',
      'components.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      // Sidecar route trees + marketing routes are out of the app tsconfig project.
      'src/routeTree.app.gen.ts',
      'src/routeTree.marketing.gen.ts',
      'src/routes/marketing/**',
    ],
  },
]

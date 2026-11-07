import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import sqlocal from 'sqlocal/vite'
import { sqlRaw } from './src/vite-sql-raw.ts'

const root = path.dirname(fileURLToPath(import.meta.url))
const siteMode =
  process.env.VITE_SITE_MODE === 'marketing' ? 'marketing' : 'app'
const isMarketing = siteMode === 'marketing'
const routeTreeFile = isMarketing
  ? 'routeTree.marketing.gen.ts'
  : 'routeTree.app.gen.ts'
const routesDirectory = isMarketing ? 'routes/marketing' : 'routes/app'

// Activate the personality's committed tree as routeTree.gen.ts (what router imports).
const srcDir = path.join(root, 'src')
const activeTree = path.join(srcDir, routeTreeFile)
const genTree = path.join(srcDir, 'routeTree.gen.ts')
if (existsSync(activeTree)) {
  copyFileSync(activeTree, genTree)
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    sqlRaw(),
    // Devtools injects data-* attributes into SSR HTML, which trips React
    // hydration warnings; opt in explicitly instead of always-on.
    ...(process.env.TANSTACK_DEVTOOLS === '1' ? [devtools()] : []),
    // OPFS isolation headers for the app only — marketing never loads SQLite.
    ...(isMarketing ? [] : [sqlocal()]),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      serverDir: './server',
    }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
      },
      router: {
        routesDirectory,
        // Watch regenerates the active tree into the import path used by router.tsx.
        generatedRouteTree: 'routeTree.gen.ts',
      },
    }),
    // After the Start plugin regenerates routeTree.gen.ts, mirror it back to the
    // mode-specific committed file so both trees stay in sync during `vite dev`.
    {
      name: 'mirror-route-tree',
      buildStart() {
        // Write only when content changed so the watcher doesn't churn CSS HMR.
        if (
          existsSync(genTree) &&
          readFileSync(genTree, 'utf8') !== readFileSync(activeTree, 'utf8')
        ) {
          copyFileSync(genTree, activeTree)
        }
      },
    },
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config

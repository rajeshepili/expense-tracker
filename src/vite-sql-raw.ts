import type { Plugin } from 'vite'

/** Treat `.sql` imports as raw strings (drizzle-kit migrations.js). */
export function sqlRaw(): Plugin {
  return {
    name: 'sql-raw',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.sql')) return null
      return {
        code: `export default ${JSON.stringify(code)}`,
        map: null,
      }
    },
  }
}

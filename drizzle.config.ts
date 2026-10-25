import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  // Bundles drizzle/migrations.js for in-browser apply (same as Expo / DO SQLite).
  driver: 'durable-sqlite',
})

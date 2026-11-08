/** Shared Serwist glob patterns (post-build inject + unit tests). */
export const SERWIST_GLOB_PATTERNS = [
  'assets/**/*.{js,css,wasm,woff,woff2,png,svg}',
  'icons/**/*.{png,svg,ico}',
  'manifest.webmanifest',
]

/** Document shell URLs — always additionalPrecacheEntries (not globbed). */
export const SERWIST_SHELL_URLS = ['/', '/_shell.html']

/**
 * Pure helpers for service-worker precache injection.
 * Kept free of process.cwd so unit tests can drive paths.
 */

export const ASSET_EXT = new Set([
  '.js',
  '.css',
  '.wasm',
  '.woff',
  '.woff2',
  '.png',
  '.svg',
  '.ico',
  '.webp',
  '.webmanifest',
  '.html',
])

/** Nitro public dirs for local node-server vs Vercel Build Output API. */
export function candidatePublicDirs(root) {
  return [
    `${root}/.vercel/output/static`,
    `${root}/.output/public`,
  ]
}

/**
 * Pick every existing public dir that already has sw.js (post-Nitro copy).
 * Prefer injecting all of them so local + Vercel layouts both work.
 */
export function resolvePublicDirs(root, existsSync) {
  return candidatePublicDirs(root).filter((dir) =>
    existsSync(`${dir}/sw.js`),
  )
}

export function walkAssetUrls(dir, { readdirSync, statSync, existsSync }, base = dir) {
  const urls = []
  if (!existsSync(dir)) return urls
  for (const name of readdirSync(dir)) {
    const full = `${dir}/${name}`
    const st = statSync(full)
    if (st.isDirectory()) {
      urls.push(...walkAssetUrls(full, { readdirSync, statSync, existsSync }, base))
      continue
    }
    const dot = name.lastIndexOf('.')
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
    if (!ASSET_EXT.has(ext)) continue
    if (name === 'sw.js') continue
    const rel = full.slice(base.length).replaceAll('\\', '/')
    urls.push(rel.startsWith('/') ? rel : `/${rel}`)
  }
  return urls
}

export function buildPrecacheList(foundUrls) {
  const shell = ['/', '/manifest.webmanifest', '/_shell.html']
  return [...new Set([...shell, ...foundUrls])].sort()
}

/** Same allowlist the service worker uses for runtime caching. */
export function isCacheableAssetPath(pathname) {
  if (pathname.startsWith('/assets/')) return true
  if (pathname === '/manifest.webmanifest') return true
  if (pathname === '/_shell.html') return true
  if (pathname.startsWith('/icons/')) return true
  return false
}

export function replaceMarkedBlock(source, startMark, endMark, replacement) {
  const start = source.indexOf(startMark)
  const end = source.indexOf(endMark)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`missing markers ${startMark} … ${endMark}`)
  }
  return (
    source.slice(0, start) +
    startMark +
    '\n' +
    replacement +
    '\n' +
    source.slice(end)
  )
}

export function patchSwSource(source, version, urls) {
  let next = replaceMarkedBlock(
    source,
    '// SW_VERSION_START',
    '// SW_VERSION_END',
    `const SW_VERSION = '${version}'`,
  )
  next = replaceMarkedBlock(
    next,
    '// PRECACHE_START',
    '// PRECACHE_END',
    `const PRECACHE = ${JSON.stringify(urls, null, 2)}`,
  )
  return next
}

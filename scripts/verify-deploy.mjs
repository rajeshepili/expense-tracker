#!/usr/bin/env node
/**
 * Post-deploy smoke check for the two-project split.
 *
 * Usage:
 *   node scripts/verify-deploy.mjs [marketingUrl] [appUrl]
 *
 * Defaults to the production hosts; pass preview URLs to check a branch deploy.
 * Asserts: 200 on /, marketing has no COEP (it must not), app HAS COEP (OPFS
 * needs it), both have HSTS + nosniff, /features 200 on marketing, app-only
 * paths return 307 edge redirects to the sibling host, and HTML carries
 * data-site-mode matching the expected build.
 *
 * Preview caveat: vercel.*.json redirects hardcode production hosts, so
 * preview wrong-host bounce relies on the client gate — edge Location may
 * still point at production. Pass matching preview URLs to check headers
 * and data-site-mode; treat edge redirect destinations as soft checks when
 * URLs are not the production defaults.
 */

const marketing = process.argv[2] ?? 'https://expense-tracker-mkt.vercel.app'
const app = process.argv[3] ?? 'https://expense-tracker-amber-two-58.vercel.app'
const isProdDefaults =
  marketing === 'https://expense-tracker-mkt.vercel.app' &&
  app === 'https://expense-tracker-amber-two-58.vercel.app'

let failures = 0

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

async function get(url, redirect = 'manual') {
  const res = await fetch(url, { redirect })
  const headers = Object.fromEntries(res.headers.entries())
  const body = await res.text()
  return { status: res.status, headers, body }
}

function hasModeMarker(body, mode) {
  return (
    body.includes(`data-site-mode="${mode}"`) ||
    body.includes(`data-site-mode='${mode}'`)
  )
}

function isRedirect(status) {
  return [301, 302, 307, 308].includes(status)
}

// Marketing project
const mRoot = await get(marketing + '/')
check('marketing / is 200', mRoot.status === 200, `got ${mRoot.status}`)
check(
  'marketing has NO COEP header',
  !mRoot.headers['cross-origin-embedder-policy'],
  mRoot.headers['cross-origin-embedder-policy'] ?? 'absent',
)
check('marketing has HSTS', Boolean(mRoot.headers['strict-transport-security']))
check(
  'marketing has nosniff',
  mRoot.headers['x-content-type-options'] === 'nosniff',
)
check('marketing has CSP', Boolean(mRoot.headers['content-security-policy']))
check(
  'marketing HTML has data-site-mode=marketing',
  hasModeMarker(mRoot.body, 'marketing'),
)

const mFeatures = await get(marketing + '/features')
check(
  'marketing /features is 200',
  mFeatures.status === 200,
  `got ${mFeatures.status}`,
)
const mPrivacy = await get(marketing + '/privacy')
check(
  'marketing /privacy is 200',
  mPrivacy.status === 200,
  `got ${mPrivacy.status}`,
)
const mLedger = await get(marketing + '/ledger')
check(
  'marketing /ledger edge-redirects to app host',
  isRedirect(mLedger.status) &&
    (mLedger.headers.location ?? '').startsWith(isProdDefaults ? app : 'http'),
  `got ${mLedger.status} → ${mLedger.headers.location ?? 'no location'}`,
)
if (isProdDefaults) {
  check(
    'marketing /ledger Location is app host',
    (mLedger.headers.location ?? '').startsWith(app),
    mLedger.headers.location ?? 'no location',
  )
}

// App project
const aRoot = await get(app + '/')
check(
  'app / responds',
  [200, 301, 302, 307, 308].includes(aRoot.status),
  `got ${aRoot.status}`,
)
check(
  'app HAS COEP require-corp (OPFS needs it)',
  aRoot.headers['cross-origin-embedder-policy'] === 'require-corp',
  aRoot.headers['cross-origin-embedder-policy'] ?? 'absent',
)
check(
  'app HAS COOP same-origin',
  aRoot.headers['cross-origin-opener-policy'] === 'same-origin',
)
check('app has HSTS', Boolean(aRoot.headers['strict-transport-security']))
check('app has CSP', Boolean(aRoot.headers['content-security-policy']))
check('app has nosniff', aRoot.headers['x-content-type-options'] === 'nosniff')
const aSw = await get(app + '/sw.js')
check(
  'app sw.js has Service-Worker-Allowed',
  aSw.headers['service-worker-allowed'] === '/',
)
check(
  'app sw.js precaches hashed assets (offline)',
  typeof aSw.body === 'string' &&
    aSw.body.includes('/assets/') &&
    aSw.body.includes('.wasm') &&
    !aSw.body.includes("const SW_VERSION = 'dev'"),
)
if (aRoot.status === 200) {
  check('app HTML has data-site-mode=app', hasModeMarker(aRoot.body, 'app'))
}

const aFeatures = await get(app + '/features')
check(
  'app /features edge-redirects to marketing host',
  isRedirect(aFeatures.status) &&
    (aFeatures.headers.location ?? '').startsWith(
      isProdDefaults ? marketing : 'http',
    ),
  `got ${aFeatures.status} → ${aFeatures.headers.location ?? 'no location'}`,
)
if (isProdDefaults) {
  check(
    'app /features Location is marketing host',
    (aFeatures.headers.location ?? '').startsWith(marketing),
    aFeatures.headers.location ?? 'no location',
  )
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll deploy checks passed')

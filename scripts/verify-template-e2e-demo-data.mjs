#!/usr/bin/env node
/**
 * Fleet gate: a template's e2e specs must not name the template's own demo data.
 *
 * `mlcl create` copies a flagship template verbatim into a user's new project,
 * e2e specs included. The user then replaces the demo/seed content with their
 * own — we explicitly instruct the AI executor to do exactly that. Any spec that
 * asserted on a seeded row's name, a fixture record's slug or a demo user's
 * email then fails on a CORRECT app, and the executor spends the run "fixing"
 * tests that were wrong about the data from the first run.
 *
 * What this checks, precisely: every string that the template's own demo data
 * carries under a CONTENT key (name, title, slug, email, body, …) must not
 * appear verbatim anywhere in `e2e/**\/*.ts`. Enum values, status codes and
 * other app vocabulary sit under non-content keys (`type:`, `status:`, `kind:`)
 * and are deliberately NOT part of the corpus — a spec may name them freely.
 *
 * The right fixes, in preference order:
 *   1. assert on structure/semantics (a role, a `data-mol-id`, a route, a
 *      non-empty list);
 *   2. read the expected value from the same source the app reads (fetch the
 *      list from the API inside the test and assert against the row you got);
 *   3. if a KNOWN record is genuinely needed, create it through the product
 *      first (fill the UI form / POST the endpoint the UI posts).
 * Never weaken, skip or delete the assertion to make this pass.
 *
 * Comments count. A comment naming a seeded row is a doc that goes stale the
 * moment the demo content is replaced, and the executor reads comments.
 *
 * Deliberate limits, so nobody mistakes this for more than it is:
 *   - The corpus is the API-side demo data (`api/fixtures/**`, and modules
 *     named for planting starter rows — `*seed*`, `bootstrap*`, `*demo*`,
 *     `*sample*`, `*starter*`, `.ts` or `.sql`). App-side placeholder content
 *     is not scanned, and a template whose demo rows live somewhere else
 *     entirely reports as having no corpus — see the `·` line it prints.
 *   - A hardcoded COUNT of demo rows (`toHaveCount(6)` where 6 is how many the
 *     seed happens to create) is the same defect but is not mechanically
 *     distinguishable from a structural count (3 pricing tiers, 2 password
 *     fields), so it is not gated. Review counts by hand.
 *
 * Usage:
 *   node scripts/verify-template-e2e-demo-data.mjs             # whole fleet
 *   node scripts/verify-template-e2e-demo-data.mjs <slug> ...  # named templates
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPS_DIR = join(MLCL_ROOT, 'templates', 'apps')

/**
 * Keys whose values are CONTENT — the rows a user replaces on day one.
 * A key not in this set (`type`, `status`, `role`, `unit`, …) holds app
 * vocabulary, which a spec is free to name.
 */
const CONTENT_KEYS = new Set([
  'address',
  'album',
  'artist',
  'author',
  'bio',
  'body',
  'brand',
  'caption',
  'channel',
  'city',
  'company',
  'content',
  'course',
  'description',
  'display_name',
  'displayname',
  'email',
  'episode',
  'excerpt',
  'first_name',
  'firstname',
  'full_name',
  'fullname',
  'handle',
  'heading',
  'headline',
  'label',
  'last_name',
  'lastname',
  'location',
  'message',
  'name',
  'player',
  'product',
  'question',
  'restaurant',
  'show',
  'slug',
  'street',
  'subject',
  'summary',
  'tagline',
  'team',
  'title',
  'username',
  'venue',
])

/**
 * Judged-CLEAN exceptions: a value that sits under a content key in the demo
 * data but is app VOCABULARY the product itself creates or renders, so a spec
 * may name it. Every entry carries the reason it was judged clean — an entry
 * without one is a suppression, which this gate exists to prevent.
 *
 * Shape: { '<template-slug>': { '<literal>': '<why it is not demo data>' } }
 */
const ALLOWED = {
  'delivery-tracking': {
    'In transit':
      'a shipment-status label the dashboard renders unconditionally; the spec asserts the KPI VALUE against /api/reports/dashboard.in_transit',
  },
  'design-canvas': {
    'Northwind · Brand Refresh':
      'landing.demoProject.title — an i18n string app/src/pages/Landing.tsx renders unconditionally, not a row',
  },
  'digital-goods-store': {
    'UI Kits':
      'a member of CATEGORIES in app/src/pages/Storefront.tsx; the specs pass it as the category of a product they create',
  },
  'fleet-management': {
    'In progress': "a work-order status filter label from the app's own status list",
  },
  'habit-tracker': {
    'Morning meditation':
      "the placeholder on the app's new-habit input (NewHabit.tsx) — the locator, never the asserted value",
  },
  'hotel-booking': {
    'Booking confirmed': "the confirmation page's own h1",
  },
  'iot-device-manager': {
    'Compressor-04':
      "the placeholder on the app's register-device input — the locator, not the data",
  },
  'mental-health-journal': {
    'A quiet morning walk':
      'a NEGATIVE guard — the spec asserts this removed mock copy does NOT render, which stays true when content is replaced',
    'A hard conversation, but honest': 'the same negative guard',
  },
  'multi-vendor-marketplace': {
    'Home & Living':
      "a category label from the app's own CATEGORIES list (Catalog.tsx, VendorProductForm.tsx)",
    'home-living': 'the slug form of that same category label',
  },
  'rental-marketplace': {
    'Big Sur':
      'a FEATURED_DESTINATIONS entry hardcoded in app/src/pages/Landing.tsx; the host specs also POST it as a listing they create',
  },
  'status-page': {
    'Asha Rahman':
      'a NEGATIVE guard — the test asserts the profile shows the signed-in user and NOT this fabricated placeholder',
  },
  'tutoring-marketplace': {
    'Test prep': 'a SUBJECT_FILTERS label mirrored from app/src/pages/Search.tsx',
  },
  'weather-dashboard': {
    'Lisbon, Portugal':
      'the spec creates this location itself, and POST /locations geocodes the address, so it has to be a real place',
    'Tokyo, Japan': 'the same — a real, geocodable address the spec supplies',
  },
  'webhook-manager': {
    'Acme · order events':
      'a NEGATIVE guard — the dashboard must show no demo data on an empty workspace',
  },
}

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    // an unreadable directory contributes nothing
    return out
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.polish') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

/**
 * Whether a key holds content. Matched on the key itself and on its suffix, so
 * `customer_name`, `ship_to_city` and `tier_title` count the same as `name`,
 * `city` and `title` — a fixture that qualifies its column names is carrying
 * exactly the same demo content.
 */
function isContentKey(key) {
  const lower = key.toLowerCase()
  if (CONTENT_KEYS.has(lower)) return true
  const tail = lower.slice(lower.lastIndexOf('_') + 1)
  return tail !== lower && CONTENT_KEYS.has(tail)
}

/**
 * Files that carry a template's demo rows: the mock-server fixtures, and any
 * module whose name says it plants starter content. `bootstrap.ts` seeds a
 * first-time user's curated set in several templates and is demo data by any
 * other name.
 */
const isDemoSource = (file) =>
  /(^|\/)fixtures?\//.test(file) || /(seed|bootstrap|demo|sample|starter)/i.test(basename(file))

/** Collect every string held under a content key, at any depth. */
function collectFromJson(node, out) {
  if (Array.isArray(node)) {
    for (const value of node) collectFromJson(value, out)
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && isContentKey(key)) out.add(value)
    else collectFromJson(value, out)
  }
}

/**
 * Whether a demo literal is distinctive enough that naming it in a spec is a
 * real coupling. A bare lowercase word, a route, a colour or a date is not.
 */
function isDistinctive(value) {
  if (value.length < 6) return false
  if (/^(https?:)?\/\//.test(value)) return false
  if (/^\/[a-z0-9/_:-]*$/i.test(value)) return false
  if (/^[#0-9a-f]{6,8}$/i.test(value)) return false
  if (/^[\d.\-:T Z/]+$/.test(value)) return false
  // multi-word text, an email, or a hyphenated slug
  return /\s\S/.test(value) || /@/.test(value) || /^[a-z0-9]+(-[a-z0-9]+){1,}$/i.test(value)
}

function demoCorpus(templateRoot) {
  const corpus = new Set()
  for (const file of walk(join(templateRoot, 'api'))) {
    if (!isDemoSource(file)) continue
    if (file.endsWith('.json')) {
      try {
        collectFromJson(JSON.parse(readFileSync(file, 'utf8')), corpus)
      } catch (_error) {
        // a fixture that is not valid JSON contributes nothing
      }
    } else if (file.endsWith('.ts') && !file.includes('__tests__')) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(
        /(\w+)\s*:\s*(?:'([^'\n\\]{3,160})'|"([^"\n\\]{3,160})"|`([^`\n\\$]{3,160})`)/g,
      )) {
        if (isContentKey(match[1])) corpus.add(match[2] ?? match[3] ?? match[4])
      }
    } else if (file.endsWith('.sql')) {
      const source = readFileSync(file, 'utf8')
      // SQL inserts carry no keys next to the value, so keep only prose-shaped
      // literals: multi-word AND capitalised.
      for (const match of source.matchAll(/'([^'\n]{6,160})'/g)) {
        if (/\s\S/.test(match[1]) && /[A-Z]/.test(match[1])) corpus.add(match[1])
      }
    }
  }
  return [...corpus].filter(isDistinctive)
}

const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const templates = (
  slugs.length
    ? slugs
    : readdirSync(APPS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
).filter((slug) => existsSync(join(APPS_DIR, slug)) && statSync(join(APPS_DIR, slug)).isDirectory())

const violations = []
const uncheckable = []
let scanned = 0

for (const slug of templates) {
  const root = join(APPS_DIR, slug)
  const e2eDir = join(root, 'e2e')
  if (!existsSync(e2eDir)) continue
  const allowed = ALLOWED[slug] ?? {}
  const corpus = demoCorpus(root).filter((value) => !(value in allowed))
  // A template whose demo data yields no corpus cannot fail this check. Say so
  // out loud — a gate whose "pass" and "did not run" look alike is no gate.
  if (corpus.length === 0) {
    uncheckable.push(slug)
    continue
  }
  for (const file of walk(e2eDir).filter((f) => f.endsWith('.ts'))) {
    scanned++
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, index) => {
      for (const value of corpus) {
        if (line.includes(value)) {
          violations.push({
            slug,
            file: relative(APPS_DIR, file),
            line: index + 1,
            value,
            text: line.trim(),
          })
        }
      }
    })
  }
}

if (uncheckable.length) {
  console.log(
    `· ${uncheckable.length} template(s) carry no demo-data corpus, so nothing was checked in them: ${uncheckable.join(', ')}`,
  )
}

if (violations.length === 0) {
  console.log(
    `✓ template e2e clean — ${scanned} spec/helper files across ${templates.length - uncheckable.length} templates name no demo data`,
  )
  process.exit(0)
}

console.error(
  `✗ ${violations.length} e2e assertion(s) name the template's own demo data.\n` +
    '  `mlcl create` ships these specs to the user, who replaces the demo content —\n' +
    '  each one then fails on a correct app. Assert on structure, read the value from\n' +
    '  the API inside the test, or create the record through the UI first. Never weaken\n' +
    '  or delete the assertion.\n',
)
let current = ''
for (const violation of violations) {
  if (violation.slug !== current) {
    current = violation.slug
    console.error(`  ${current}`)
  }
  console.error(
    `    ${violation.file}:${violation.line}  names ${JSON.stringify(violation.value)}\n` +
      `      ${violation.text}`,
  )
}
process.exit(1)

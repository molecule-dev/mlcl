#!/usr/bin/env node
/**
 * Generate rich per-flagship catalog docs for AI-driven template selection.
 *
 * For each app under templates/apps/<slug>/ this writes a committed
 * CATALOG.md describing what the app actually does — meta, data model,
 * screens, subscription tiers, and grouped integrations — by extracting from
 * registry.json + the template's own files (migrations, handlers,
 * screen-map.json, tiers.ts). Also writes templates/apps/CATALOG_INDEX.md, a
 * cluster → one-liner index used as the first turn of selection.
 *
 * These docs are read at runtime by molecule-dev's starting-point selection AND
 * injected into the executor's prompt as the "what already exists" map, so a
 * stale CATALOG.md silently feeds the build wrong info. Regenerate after changing
 * any flagship: `npm run gen:template-catalog`.
 *
 * `--check` mode renders in-memory and compares to the committed files WITHOUT
 * writing, exiting non-zero (and listing the drifted files) if any are stale — a
 * CI guard so a flagship edit that forgets to regenerate is caught.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import prettier from 'prettier'

const APPS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'apps')
const NON_APP_ENTRIES = new Set([
  '_e2e-shared',
  'registry.json',
  'docker-compose.yml',
  'CATALOG_INDEX.md',
])
/** Framework-provided tables that don't describe the app's own domain. */
const FRAMEWORK_TABLES = new Set(['users', 'usersSecrets', 'sessions', 'migrations'])

/** Group label for the `@molecule/api-*` packages of a `type: 'static'` template. */
const BUILD_TIME_GROUP = 'Build-time (static generation)'

/**
 * Map a package name to a human integration group.
 *
 * A `type: 'static'` template has no server — `npm run build` prerenders it to
 * `dist/`. Its `@molecule/api-*` packages (content loading, RSS/Atom feeds,
 * sitemap) therefore run once at BUILD time, not per request, so they get their
 * own group instead of falling through to the runtime "Other API" bucket, which
 * pointed the executor at a request-time API that does not exist.
 */
function packageGroup(name, isStatic = false) {
  const n = name.replace(/^@molecule\/(api|app)-/, '')
  if (isStatic && name.startsWith('@molecule/api-')) return BUILD_TIME_GROUP
  if (/^database/.test(n)) return 'Database'
  if (/^search/.test(n)) return 'Search'
  if (/^(payments|entitlements|billing)/.test(n)) return 'Payments & billing'
  if (/^ai/.test(n)) return 'AI'
  if (/^(uploads|image|video|media|storage)/.test(n)) return 'Uploads & media'
  if (/^(emails?|email-templates)/.test(n)) return 'Email'
  if (/^(realtime|channels|websocket|socket)/.test(n)) return 'Realtime'
  if (/^(oauth|auth|permissions)/.test(n)) return 'Auth & permissions'
  if (/^(push|notifications)/.test(n)) return 'Notifications'
  if (/^resource-/.test(n)) return 'Domain resources'
  if (name.startsWith('@molecule/app-')) return 'Frontend / UI'
  return 'Other API'
}

/** Extract `{ table -> [columns] }` from a template's migration SQL. */
function extractDataModel(appDir) {
  const migDir = join(appDir, 'api', 'migrations')
  if (!existsSync(migDir)) return []
  const tables = []
  for (const file of readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(join(migDir, file), 'utf8')
    // Body is non-greedy up to a `)` at the start of a line (the conventional
    // close — using own-line `)` avoids matching internal parens like numeric(10,2)
    // or CHECK (...)). `[^;\n]*` after it tolerates a trailing clause before the
    // semicolon — e.g. MySQL `) ENGINE=InnoDB;` or SQLite `) WITHOUT ROWID;` —
    // which a bare `\)\s*;` would miss, silently dropping the table from the doc.
    const re =
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?["']?([A-Za-z0-9_]+)["']?\s*\(([\s\S]*?)\n\)[^;\n]*;/gi
    let m
    while ((m = re.exec(sql))) {
      const name = m[1]
      if (FRAMEWORK_TABLES.has(name)) continue
      if (tables.some((t) => t.name === name)) continue
      const cols = []
      for (const line of m[2].split('\n')) {
        const c = line.trim().match(/^["']?([A-Za-z0-9_]+)["']?\s+[A-Za-z]/)
        if (!c) continue
        const col = c[1]
        if (/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK|REFERENCES)$/i.test(col)) continue
        cols.push(col)
      }
      tables.push({ name, cols })
    }
  }
  return tables
}

/** List domain handlers from api/src/handlers/*.ts, with their real file paths. */
function extractHandlers(appDir) {
  const dir = join(appDir, 'api', 'src', 'handlers')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => ({ name: f.replace(/\.ts$/, ''), path: `api/src/handlers/${f}` }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Real on-disk path of a screen/component. screen-map's `templateFile` is the
 * template-relative path WITHOUT the `src/` segment (e.g. `app/pages/X.tsx`);
 * the scaffolded project puts it under `src/` (`app/src/pages/X.tsx`). Normalize
 * so the catalog names the file the implementer will actually edit.
 */
function screenFilePath(templateFile) {
  if (!templateFile) return ''
  return templateFile.replace(/^app\//, 'app/src/').replace(/^api\//, 'api/src/')
}

/** Read screens (name/route/auth/file) from screen-map.json. */
function extractScreens(appDir) {
  const f = join(appDir, 'screen-map.json')
  if (!existsSync(f)) return []
  try {
    const data = JSON.parse(readFileSync(f, 'utf8'))
    return (data.screens ?? []).map((s) => ({
      name: s.name,
      route: s.route ?? '',
      auth: s.auth === true,
      file: screenFilePath(s.templateFile),
    }))
  } catch (_error) {
    // Malformed screen-map.json is treated as "no screens" — the catalog still
    // renders the rest of the app rather than failing the whole fleet run.
    return []
  }
}

/** Best-effort: does the app define subscription tiers, and which limit keys? */
function extractTiers(appDir) {
  const f = join(appDir, 'api', 'src', 'tiers.ts')
  if (!existsSync(f)) return null
  const src = readFileSync(f, 'utf8')
  const ifaceMatch = src.match(/export interface \w*Limits \{([\s\S]*?)\n\}/)
  const limitKeys = ifaceMatch
    ? [...ifaceMatch[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*[:?]/gm)].map((m) => m[1])
    : []
  const hasStdTiers = /\bfree\b/.test(src) && /\bpro\b/.test(src) && /\bteam\b/.test(src)
  return { tiers: hasStdTiers ? ['free', 'pro', 'team'] : [], limitKeys }
}

/** Render one app's CATALOG.md. */
function renderCatalog(slug, entry, appDir) {
  const dataModel = extractDataModel(appDir)
  const handlers = extractHandlers(appDir)
  const screens = extractScreens(appDir)
  const tiers = extractTiers(appDir)

  const isStatic = entry.type === 'static'

  const groups = new Map()
  for (const pkg of entry.packages ?? []) {
    const g = packageGroup(pkg, isStatic)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(pkg)
  }

  const env = entry.env ?? {}
  const requiredSecrets = Object.entries(env)
    .filter(([, v]) => v && v.required)
    .map(([k, v]) => `${k} — ${v.description ?? ''}`.trim())

  const lines = []
  lines.push(`# ${entry.label ?? slug}`)
  lines.push('')
  lines.push(`- **slug**: \`${slug}\``)
  lines.push(`- **cluster**: ${entry.cluster ?? 'uncategorized'}`)
  lines.push(`- **type**: ${entry.type ?? 'full-stack'}`)
  if (entry.layout) lines.push(`- **layout**: ${entry.layout}`)
  lines.push('')
  lines.push(entry.description ?? '')
  lines.push('')
  lines.push(
    `> **This is a complete, working app, already built.** The data model, handlers, and screens ` +
      `below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the ` +
      `listed files in place** for the request; do not recreate tables, handlers, or pages that already ` +
      `exist, and do not add packages for functionality already implemented here.`,
  )
  lines.push('')

  if ((entry.features ?? []).length) {
    lines.push(`## Features`)
    lines.push(entry.features.map((f) => `\`${f}\``).join(', '))
    lines.push('')
  }

  if (dataModel.length) {
    lines.push(`## Data model (${dataModel.length} domain tables)`)
    lines.push(
      `_Already created by the existing SQL in \`api/migrations/\` — do NOT add new migrations for these tables._`,
    )
    for (const t of dataModel) {
      const cols = t.cols.slice(0, 12).join(', ')
      lines.push(`- **${t.name}**${cols ? ` — ${cols}${t.cols.length > 12 ? ', …' : ''}` : ''}`)
    }
    lines.push('')
  }

  if (handlers.length) {
    lines.push(`## API surface (handlers)`)
    lines.push(
      `_These endpoints already exist — open and extend the named file, never recreate it._`,
    )
    for (const h of handlers) {
      lines.push(`- **${h.name}** — \`${h.path}\``)
    }
    lines.push('')
  }

  if (screens.length) {
    lines.push(`## Screens (${screens.length})`)
    lines.push(
      `_These pages already exist — edit the named file in place, never create a parallel one._`,
    )
    for (const s of screens) {
      const file = s.file ? ` → \`${s.file}\`` : ''
      lines.push(`- **${s.name}** \`${s.route}\`${s.auth ? ' (auth)' : ''}${file}`)
    }
    lines.push('')
  }

  if (tiers && tiers.tiers.length) {
    lines.push(`## Subscription tiers`)
    lines.push(
      `${tiers.tiers.join(' / ')} — gated by: ${tiers.limitKeys.slice(0, 12).join(', ') || 'feature limits'}`,
    )
    lines.push('')
  }

  if (groups.size) {
    lines.push(`## Integrations (${(entry.packages ?? []).length} @molecule/* packages)`)
    if (groups.has(BUILD_TIME_GROUP)) {
      lines.push(
        `_This app has no server. The ${BUILD_TIME_GROUP} packages run inside \`npm run build\`, ` +
          `which prerenders the site to \`dist/\` — there is no request-time API to call or extend._`,
      )
    }
    for (const g of [...groups.keys()].sort()) {
      lines.push(
        `- **${g}**: ${groups
          .get(g)
          .map((p) => `\`${p}\``)
          .join(', ')}`,
      )
    }
    lines.push('')
  }

  if (requiredSecrets.length) {
    lines.push(`## Required secrets`)
    for (const s of requiredSecrets) lines.push(`- ${s}`)
    lines.push('')
  }

  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

// ── main ────────────────────────────────────────────────────────────────────
const registry = JSON.parse(readFileSync(join(APPS_DIR, 'registry.json'), 'utf8'))
const templates = registry.templates ?? {}

const slugs = readdirSync(APPS_DIR).filter((s) => {
  if (NON_APP_ENTRIES.has(s)) return false
  const dir = join(APPS_DIR, s)
  return statSync(dir).isDirectory() && existsSync(join(dir, 'template.json'))
})

const CHECK = process.argv.includes('--check')
/** In --check mode, record drift instead of writing; else write the file. */
const drifted = []
async function emit(path, content) {
  // Generated markdown is held to the same formatting standard as hand-written
  // markdown — otherwise the generator is the one writer in the repo exempt from
  // it, which is exactly how every CATALOG.md/README.md came to be
  // unformatted while `*.md` sat in .prettierignore. Config resolves from the
  // TARGET path. Mirrors formatGeneratedMarkdown() in src/lib/format.ts;
  // duplicated because this script runs as plain node and cannot import the TS
  // lib. A parse failure writes the doc unformatted rather than losing it — the
  // repo's format gate surfaces it either way.
  // Formats to a fixed point: prettier's markdown pass is not idempotent when a
  // fenced block holds code it also formats, so one pass can leave a file that
  // `prettier --check` still rejects.
  let formatted = content
  try {
    const config = await prettier.resolveConfig(path)
    const options = { ...config, filepath: path, parser: 'markdown' }
    for (let pass = 0; pass < 4; pass++) {
      const next = await prettier.format(formatted, options)
      if (next === formatted) break
      formatted = next
    }
  } catch (error) {
    console.warn(`  prettier: skipped ${path} (markdown parse error)`, error)
  }
  if (CHECK) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null
    if (current !== formatted) drifted.push(path)
  } else {
    writeFileSync(path, formatted)
  }
}

let written = 0
const indexByCluster = new Map()

for (const slug of slugs.sort()) {
  const entry = templates[slug]
  if (!entry) {
    console.warn(`(skip) ${slug}: no registry entry`)
    continue
  }
  const appDir = join(APPS_DIR, slug)
  await emit(join(appDir, 'CATALOG.md'), renderCatalog(slug, entry, appDir))
  written++

  const cluster = entry.cluster ?? 'uncategorized'
  if (!indexByCluster.has(cluster)) indexByCluster.set(cluster, [])
  indexByCluster
    .get(cluster)
    .push(`- \`${slug}\` — **${entry.label ?? slug}**: ${entry.description ?? ''}`)
}

const idx = [
  '# Flagship template index',
  '',
  `${written} templates, grouped by cluster. Use \`inspect_template(slug)\` to read a template's full CATALOG.md.`,
  '',
]
for (const cluster of [...indexByCluster.keys()].sort()) {
  idx.push(`## ${cluster}`, '', ...indexByCluster.get(cluster).sort(), '')
}
await emit(join(APPS_DIR, 'CATALOG_INDEX.md'), idx.join('\n').trimEnd() + '\n')

if (CHECK) {
  if (drifted.length > 0) {
    console.error(
      `✗ ${drifted.length} CATALOG file(s) are stale — run \`npm run gen:template-catalog\`:`,
    )
    for (const p of drifted) console.error(`  - ${p.replace(APPS_DIR + '/', '')}`)
    process.exit(1)
  }
  console.log(`✓ all ${written} CATALOG.md + CATALOG_INDEX.md are in sync with the templates`)
} else {
  console.log(
    `Generated ${written} CATALOG.md + CATALOG_INDEX.md (${indexByCluster.size} clusters)`,
  )
}

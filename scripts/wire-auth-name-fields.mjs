#!/usr/bin/env node
/**
 * One-shot codemod (TPL1): bind the non-secret name-family identity fields
 * (`name` / `firstName` / `lastName` / `fullName`) of each flagship Signup
 * page to the shared `useAuthFormState` hook, exactly like `email` already
 * is — so a name typed on Signup survives a Signup→Login→Signup view swap
 * and is cleared on successful auth.
 *
 * It rewrites the local `const [name, setName] = useState('')` declarations
 * (which sit BEFORE the hook destructure, so they can't reference it) into
 * `const name = authFormFields.name ?? ''` + a `setAuthFormField('name', …)`
 * setter inserted right after the existing `email` binding.
 *
 * Secrets (`password` / `confirmPassword`) are intentionally NOT touched —
 * they stay in local state. See `scripts/verify-auth-form-state.mjs` for the
 * documented rationale (credential hygiene + current-vs-new-password
 * semantics) and the gate that enforces the exclusion.
 *
 * Usage:
 *   node scripts/wire-auth-name-fields.mjs --dry-run   # dump every edit, write nothing
 *   node scripts/wire-auth-name-fields.mjs             # apply
 *
 * Safe to re-run: files with no local name-family state are skipped.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APPS_DIR = fileURLToPath(new URL('../templates/apps/', import.meta.url))
const DRY = process.argv.includes('--dry-run')

/**
 * Shared non-secret identity fields (free-text the user enters): the
 * name-family plus org/tenant/account-identity fields. NOT secrets
 * (password/confirm) and NOT selects-with-defaults (role/accountType/
 * targetLang) or consent checkboxes (agree) — those stay local.
 */
const NAME_FIELDS = [
  'name',
  'firstName',
  'lastName',
  'fullName',
  'handle',
  'handleName',
  'username',
  'company',
  'companyName',
  'organization',
  'workspace',
  'subdomain',
  'restaurant',
  'recoveryEmail',
]

const EMAIL_ANCHOR = "  const setEmail = (value: string): void => setAuthFormField('email', value)"

const OLD_COMMENT =
  '  // Cross-view auth form persistence (email shared across Login/Signup/\n' +
  '  // Forgot/Reset, cleared on success) via the shared @molecule hook.'

/**
 * Collect every Signup auth-view file under each template's `app/src`.
 *
 * @returns {string[]} Absolute file paths.
 */
function collectSignupViews() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        walk(join(dir, entry.name))
      } else if (/^Signup(Form)?\.tsx$/.test(entry.name)) {
        out.push(join(dir, entry.name))
      }
    }
  }
  for (const slug of readdirSync(APPS_DIR)) {
    const srcDir = join(APPS_DIR, slug, 'app', 'src')
    try {
      if (statSync(srcDir).isDirectory()) walk(srcDir)
    } catch (_error) {
      // No app/src (api-only template) — nothing to wire.
    }
  }
  return out
}

const files = collectSignupViews()
let changed = 0
const skipped = []
const failed = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')

  // Find local name-family declarations, capturing field + setter, in order.
  const decl = new RegExp(
    `^\\s*const \\[\\s*(${NAME_FIELDS.join('|')})\\s*,\\s*(set\\w+)\\s*\\]\\s*=\\s*useState\\(''\\)\\s*$`,
  )
  const found = []
  for (const line of lines) {
    const m = line.match(decl)
    if (m) found.push({ field: m[1], setter: m[2] })
  }
  if (found.length === 0) {
    skipped.push(file)
    continue
  }

  // Sanity: setter must be `set<Capitalized field>`.
  for (const { field, setter } of found) {
    const expected = 'set' + field[0].toUpperCase() + field.slice(1)
    if (setter !== expected) {
      failed.push(`${file}: unexpected setter ${setter} for ${field} (want ${expected})`)
    }
  }
  // Must have exactly one email anchor to insert after.
  if (src.split('\n').filter((l) => l === EMAIL_ANCHOR).length !== 1) {
    failed.push(`${file}: email anchor not found exactly once`)
    continue
  }
  if (failed.some((f) => f.startsWith(file))) continue

  // Remove the local declaration lines.
  const kept = lines.filter((line) => !decl.test(line))

  // Build the shared bindings to insert after the email anchor.
  const bindings = found.flatMap(({ field }) => [
    `  const ${field} = authFormFields.${field} ?? ''`,
    `  const set${field[0].toUpperCase() + field.slice(1)} = (value: string): void => setAuthFormField('${field}', value)`,
  ])

  const anchorIdx = kept.indexOf(EMAIL_ANCHOR)
  kept.splice(anchorIdx + 1, 0, ...bindings)

  let result = kept.join('\n')

  // Refresh the doc comment (exact-match only — leave bespoke comments alone).
  const sharedList = ['email', ...found.map((f) => f.field)].join(', ')
  const newComment =
    `  // Cross-view auth form persistence via the shared @molecule hook: the\n` +
    `  // non-secret identity fields (${sharedList}) are shared across the auth\n` +
    `  // views (Login/Signup/Forgot/Reset) and cleared on success. Secrets\n` +
    `  // (password) are deliberately kept in LOCAL state, never shared — see\n` +
    `  // useAuthFormState's docs for the rationale.`
  if (result.includes(OLD_COMMENT)) result = result.replace(OLD_COMMENT, newComment)

  if (DRY) {
    console.log(`\n--- ${file.slice(APPS_DIR.length)}`)
    console.log(`  remove: ${found.map((f) => `[${f.field}, ${f.setter}]`).join(', ')}`)
    console.log(`  insert after email anchor:`)
    for (const b of bindings) console.log(`    ${b.trim()}`)
  } else {
    writeFileSync(file, result, 'utf8')
  }
  changed++
}

console.log(
  `\n${DRY ? '[dry-run] ' : ''}${changed} signup view(s) ${DRY ? 'would be ' : ''}rewired, ${skipped.length} skipped (no local name state), ${failed.length} failed`,
)
for (const f of failed) console.error(`  ✗ ${f}`)
if (failed.length) process.exit(1)

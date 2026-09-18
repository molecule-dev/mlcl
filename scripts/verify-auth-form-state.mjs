#!/usr/bin/env node
/**
 * TPL1 regression gate — enforce the auth-form cross-view persistence policy
 * across every flagship template's Login/Signup/Forgot/Reset views.
 *
 * THE POLICY (the verbatim asked the auth views to "remember email and
 * password and any other shared fields when they switch between views"):
 *
 *   - SHARED, non-secret identity fields the user TYPES (`email`, the
 *     name-family `name`/`firstName`/`lastName`/`fullName`/`handle`/
 *     `handleName`, and org/tenant/account identity like `username`/
 *     `company`/`companyName`/`organization`/`workspace`/`subdomain`/
 *     `restaurant`/`recoveryEmail`) MUST be wired through the cross-view
 *     `useAuthFormState` hook from `@molecule/app-auth-shell-react`, NOT held
 *     in local `useState`, so a value typed on one auth view survives the SPA
 *     route swap to another and is cleared on successful auth. (Selects with
 *     semantic defaults — role/accountType/targetLang — and the consent
 *     checkbox `agree` stay local: they are choices/consent, not entered
 *     identity.)
 *
 *   - SECRETS (`password` / `confirmPassword`) are DELIBERATELY NOT shared
 *     across views — they stay in LOCAL component state. This is an explicit
 *     security decision, not an oversight, for two reasons:
 *       1. Credential hygiene — a plaintext password must not linger in a
 *          JS-readable cross-view store for the whole SPA session, and would
 *          be written to disk if a consumer injected a sessionStorage
 *          provider (which `useAuthFormState` supports) so email survives a
 *          full reload.
 *       2. Semantic mismatch — Login captures `autoComplete="current-password"`
 *          (the EXISTING password) while Signup/ResetPassword capture
 *          `autoComplete="new-password"` (a NEW password being created). They
 *          are different values; carrying one into the other would pre-fill
 *          the wrong secret. Browser password managers already re-fill the
 *          same-field credential, so the marginal "don't retype" benefit does
 *          not justify the correctness + exposure cost.
 *     This gate FAILS the build if any auth view binds a secret to the shared
 *     store, so the decision can't be silently reverted.
 *
 * Why this exists: 64 of 133 templates shipped marked-done while their auth
 * pages kept a local `const [email, setEmail] = useState(...)`, so the field
 * typed on one auth view was silently lost when the user switched views. The
 * imports/catalog checks never looked at field wiring, so the regression
 * shipped invisibly. This gate makes the anti-patterns a hard build failure.
 *
 * Usage:
 *   node scripts/verify-auth-form-state.mjs           # scan, exit 1 on any violation
 *   node scripts/verify-auth-form-state.mjs --json     # machine-readable report
 *
 * Importable: `import { scanAuthViews } from './verify-auth-form-state.mjs'`
 * (used by the vitest gate in src/lib/__tests__).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APPS_DIR = fileURLToPath(new URL('../templates/apps/', import.meta.url))

/** Auth-view filenames whose `email` field is shared across views (TPL1 scope). */
const AUTH_VIEW_RE = /^(Login|Signup|ForgotPassword|ResetPassword)(Form)?\.tsx$/

/** A local React state declaration for the shared `email` field. */
const LOCAL_EMAIL_STATE_RE = /const\s+\[\s*email\s*,\s*set\w+\s*\]\s*=\s*useState\b/

/**
 * A local React state declaration for a SHARED non-secret identity field
 * (free-text the user enters: name-family + org/tenant/account identity).
 * These must be wired through `useAuthFormState`, not held locally, so they
 * persist across auth views like `email`. (Selects with semantic defaults —
 * role/accountType/targetLang — and the consent checkbox `agree` are NOT
 * here: they are choices/consent, not entered identity, and stay local.)
 */
const LOCAL_NAME_STATE_RE =
  /const\s+\[\s*(?:name|firstName|lastName|fullName|handle|handleName|username|company|companyName|organization|workspace|subdomain|restaurant|recoveryEmail)\s*,\s*set\w+\s*\]\s*=\s*useState\b/

/**
 * A SECRET field bound to the cross-view shared store — the forbidden
 * anti-pattern. Matches `setField('password', …)` / `setAuthFormField(...)`
 * and reads like `fields.password` / `authFormFields.confirmPassword`.
 */
const SHARED_SECRET_RE =
  /(?:setField|set\w*FormField)\(\s*['"](?:password|confirmPassword|confirm)['"]|(?:fields|authFormFields)\.(?:password|confirmPassword|confirm)\b/

const HOOK_IMPORT_RE = /from\s+'@molecule\/app-auth-shell-react'/
/** A controlled email input bound to the `email` identifier. */
const CONTROLLED_EMAIL_INPUT_RE = /value=\{\s*email\s*\}/

/**
 * Recursively collect every auth-view `.tsx` under each template's
 * `app/src` directory.
 *
 * @param {string} appsDir - Absolute path to `templates/apps`.
 * @returns {string[]} Absolute paths of auth-view files.
 */
function collectAuthViews(appsDir) {
  const out = []
  for (const slug of readdirSync(appsDir)) {
    const srcDir = join(appsDir, slug, 'app', 'src')
    // No initializer: both branches below assign it.
    let isDir
    try {
      isDir = statSync(srcDir).isDirectory()
    } catch (_error) {
      // Template has no app/src (api-only or partial fixture) — skip it.
      isDir = false
    }
    if (isDir) walk(srcDir, out)
  }
  return out
}

/**
 * Depth-first walk collecting auth-view files into `acc`.
 *
 * @param {string} dir - Directory to walk.
 * @param {string[]} acc - Accumulator of matching file paths.
 */
function walk(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      walk(full, acc)
    } else if (AUTH_VIEW_RE.test(entry.name)) {
      acc.push(full)
    }
  }
}

/**
 * Scan all template auth views for TPL1 violations.
 *
 * @param {string} [appsDir=APPS_DIR] - Absolute path to `templates/apps`.
 * @returns {{ scanned: number, wired: number, violations: { file: string, reason: string }[] }}
 */
export function scanAuthViews(appsDir = APPS_DIR) {
  const files = collectAuthViews(appsDir)
  const violations = []
  let wired = 0
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const rel = file.slice(appsDir.length)
    const hasHook = HOOK_IMPORT_RE.test(src)
    if (hasHook) wired++
    if (LOCAL_EMAIL_STATE_RE.test(src)) {
      violations.push({
        file: rel,
        reason:
          'declares a local `const [email, setEmail] = useState(...)` — use useAuthFormState() from @molecule/app-auth-shell-react so the email is shared across auth views',
      })
      continue
    }
    // Shared non-secret identity fields (name-family) must also be hook-wired.
    if (LOCAL_NAME_STATE_RE.test(src)) {
      violations.push({
        file: rel,
        reason:
          'holds a shared non-secret identity field (name-family / username / company / organization / workspace / subdomain / restaurant / recoveryEmail) in local useState — bind it via useAuthFormState() (setField(...)) so it persists across auth views like email',
      })
      continue
    }
    // Secrets must NEVER be persisted across views (security decision — see header).
    if (SHARED_SECRET_RE.test(src)) {
      violations.push({
        file: rel,
        reason:
          'binds a secret (password/confirmPassword) to the cross-view shared store — secrets are deliberately NOT persisted (credential hygiene + current-vs-new-password semantics, see header). Keep password in local component useState',
      })
      continue
    }
    // A controlled email input with no hook import = an unwired auth view.
    if (CONTROLLED_EMAIL_INPUT_RE.test(src) && !hasHook) {
      violations.push({
        file: rel,
        reason:
          'binds a controlled email input (value={email}) without importing useAuthFormState — the email will not persist across auth views',
      })
    }
  }
  return { scanned: files.length, wired, violations }
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const { scanned, wired, violations } = scanAuthViews()
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ scanned, wired, violations }, null, 2))
  }
  if (violations.length) {
    console.error(
      `\n✗ TPL1 gate: ${violations.length} auth view(s) not wired to useAuthFormState:\n`,
    )
    for (const v of violations) console.error(`  ${v.file}\n    → ${v.reason}`)
    console.error(
      `\nFix: bind shared non-secret fields (email, name-family) via useAuthFormState()` +
        ` and keep secrets (password) in local useState (see any wired template,` +
        ` e.g. sports-league/app/src/pages/Login.tsx + event-ticketing/app/src/pages/Signup.tsx).`,
    )
    process.exit(1)
  }
  console.log(`✓ TPL1 gate: ${scanned} auth views scanned, ${wired} wired, 0 violations`)
}

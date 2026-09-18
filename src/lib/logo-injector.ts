/**
 * Scaffold-time logo injector.
 *
 * Replaces the hardcoded default Molecule logo at `<appPath>/public/logo.svg`
 * (or any custom `publicDir`) with a deterministic per-app glyph tinted with
 * the project's `BRAND_COLOR`. Glyph selection is a stable hash of the app
 * name so re-running scaffolding for the same name always produces the same
 * logo.
 *
 * The default logo is detected by md5 hash (`DEFAULT_LOGO_MD5`); any app that
 * has already shipped a custom SVG (e.g. `course-marketplace`,
 * `medication-reminder`) is skipped automatically.
 *
 * @module
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * md5 of the default Molecule glyph SVG shipped at
 * `mlcl/templates/app/shared/logo.svg.tpl`. Used as the sentinel that says
 * "this template has never been re-branded — safe to overwrite."
 */
export const DEFAULT_LOGO_MD5 = 'c43b12fbd18f4911fa3a3b508cacd4d0'

/**
 * Resolve the directory holding the glyph SVG snippets shipped inside mlcl.
 *
 * Each `*.svg` is just the inner SVG body (no `<svg>` wrapper) with one or
 * more occurrences of the literal token `__BRAND_COLOR__`, which the
 * injector replaces with the per-app brand color.
 */
export function getGlyphsDir(): string {
  return join(__dirname, '..', '..', 'templates', 'app', 'shared', 'logo-glyphs')
}

/**
 * Return the sorted list of available glyph names (filenames without `.svg`).
 * Sorted so the order is stable across machines / filesystems — important
 * because the picker indexes into this array deterministically by hash.
 */
export function listGlyphs(): string[] {
  return readdirSync(getGlyphsDir())
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -'.svg'.length))
    .sort()
}

/**
 * Deterministically pick a glyph name from the library based on the app name.
 *
 * Uses the sum of charCodes of the lowercased app name modulo glyph count.
 * Stable, dependency-free, and produces a reasonably even spread for typical
 * English-language app names.
 */
export function pickGlyph(appName: string, glyphs: string[] = listGlyphs()): string {
  if (glyphs.length === 0) {
    throw new Error('No glyphs found in logo-glyphs/')
  }
  const normalized = appName.toLowerCase()
  let sum = 0
  for (let i = 0; i < normalized.length; i++) {
    sum = (sum + normalized.charCodeAt(i)) >>> 0
  }
  return glyphs[sum % glyphs.length]!
}

/** Read a glyph snippet by name and return its raw inner SVG body. */
export function readGlyph(name: string): string {
  return readFileSync(join(getGlyphsDir(), `${name}.svg`), 'utf-8').trimEnd()
}

/**
 * Substitute the brand color into a glyph snippet and wrap it in a complete
 * 32×32 SVG document ready to ship as `public/logo.svg`.
 */
export function buildLogoSvg(glyphName: string, brandColor: string): string {
  const inner = readGlyph(glyphName).replaceAll('__BRAND_COLOR__', brandColor)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
${inner}
</svg>
`
}

export interface InjectLogoOptions {
  /** Path to the app project root (the directory containing `public/`). */
  appPath: string
  /** App name used as the deterministic glyph-picker seed. */
  appName: string
  /** Brand color in `#rrggbb` form; substituted into the glyph SVG. */
  brandColor: string
  /** Where the logo lives relative to `appPath`. Defaults to `public`. */
  publicDir?: string
  /**
   * If true, overwrite even if the existing logo is custom (non-default md5).
   * Defaults to false so we never clobber a hand-crafted logo.
   */
  force?: boolean
}

export interface InjectLogoResult {
  /** Full path to the logo file we considered. */
  logoPath: string
  /** Whether we wrote a new logo. */
  written: boolean
  /** Glyph name picked for this app (set even when skipped). */
  glyph: string
  /** Reason we skipped, if applicable. */
  reason?: 'custom-logo' | 'no-public-dir'
}

/**
 * Inject a per-app logo at `<appPath>/<publicDir>/logo.svg`.
 *
 * Skips (without writing) if `logo.svg` already exists with a non-default md5
 * — i.e. someone has already replaced it with a custom SVG. Pass `force: true`
 * to override.
 */
export async function injectLogo(options: InjectLogoOptions): Promise<InjectLogoResult> {
  const { appPath, appName, brandColor, publicDir = 'public', force = false } = options
  const glyph = pickGlyph(appName)
  const publicPath = join(appPath, publicDir)
  const logoPath = join(publicPath, 'logo.svg')

  if (!existsSync(publicPath)) {
    return { logoPath, written: false, glyph, reason: 'no-public-dir' }
  }

  if (!force && existsSync(logoPath)) {
    const existing = readFileSync(logoPath)
    const md5 = createHash('md5').update(existing).digest('hex')
    if (md5 !== DEFAULT_LOGO_MD5) {
      return { logoPath, written: false, glyph, reason: 'custom-logo' }
    }
  }

  await mkdir(publicPath, { recursive: true })
  await writeFile(logoPath, buildLogoSvg(glyph, brandColor))
  return { logoPath, written: true, glyph }
}

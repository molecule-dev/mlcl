/**
 * One definition of "this is an EXACT version" — and of which versions a
 * project's RANGE pin actually selects — shared by every path that binds a
 * package's setup SQL to a version.
 *
 * The registry bundle (`setupSql` + `setupSqlVersion`), an installed/source
 * copy's `package.json`, and a project manifest's pin are compared as STRINGS.
 * That only decides which schema a scaffold copies if all three are exact
 * versions — `^1.2.0`, `~1.2.0`, `latest`, `1.x`, `workspace:*`, `file:../x`
 * and a URL all denote "some version, decided later", and the operation cannot
 * say which one's DDL it preflighted.
 *
 * A range is not the same as "unknown", though. `^2.0.0` DOES name the set of
 * versions it accepts, so a copy already on disk that falls inside it is the
 * version the app will run, and the registry's pin is usable when it falls
 * inside it too — that is {@link satisfiesVersionRange}. What cannot be
 * evaluated at all (a dist-tag, a `file:`/`workspace:`/git/URL spec) stays
 * unbound, and a range nothing satisfies is refused naming what was found.
 *
 * A prerelease/build suffix is exact (`1.2.0-rc.1`) — it names one published
 * version, so it can be matched like any other. A prerelease is never taken to
 * satisfy a RANGE (npm excludes prereleases from ranges for the same reason:
 * the range does not name them), so it only binds through an exact pin or a
 * copy at exactly that version.
 *
 * @module
 */

import { compareVersions } from './package-upgrades.js'

/** Exact semver: `major.minor.patch`, plus optional prerelease/build suffixes. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/**
 * Whether `value` names exactly ONE package version.
 *
 * @param value - A version string from a manifest, a package.json or the registry.
 * @returns True for an exact semver release/prerelease; false for ranges,
 *   tags, paths and anything else whose bytes are not yet determined.
 */
export function isExactVersion(value: unknown): value is string {
  return typeof value === 'string' && EXACT_VERSION.test(value)
}

/** One comparator a range expands to (`>=1.2.3`, `<2.0.0`, `=1.2.3`). */
interface Comparator {
  /** The comparison to apply. */
  op: '>=' | '>' | '<=' | '<' | '='
  /** The version it compares against (always exact). */
  version: string
}

/** A partial version in a comparator: `1`, `1.2`, `1.x`, `*`, `1.2.3`. */
const PARTIAL =
  /^(\^|~|>=|<=|>|<|=)?[v\s]*(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/**
 * The versions a single comparator token accepts, as `Comparator`s that must
 * ALL hold.
 *
 * Handles the npm shapes a project or registry realistically holds: `^1.2.3`,
 * `~1.2.3`, `>=1.2.3`, `1.2.x`, `1`, `*`, and a bare version. Anything else
 * (a tag, a path, a protocol) returns null — the caller then treats the spec as
 * unbound rather than guessing.
 *
 * @param raw - One whitespace-separated token of a range.
 * @returns The comparators, or null when the token is not a version range.
 */
function parseComparator(raw: string): Comparator[] | null {
  const match = PARTIAL.exec(raw)
  if (!match) return null
  const [, op = '', majorRaw, minorRaw, patchRaw] = match
  const wild = (value: string | undefined): boolean =>
    value === undefined || value === 'x' || value === 'X' || value === '*'
  if (wild(majorRaw)) return [] // `*` / `x`: every version
  const major = Number.parseInt(majorRaw!, 10)
  const minorGiven = !wild(minorRaw)
  const patchGiven = minorGiven && !wild(patchRaw)
  const minor = minorGiven ? Number.parseInt(minorRaw!, 10) : 0
  const patch = patchGiven ? Number.parseInt(patchRaw!, 10) : 0
  const at = `${major}.${minor}.${patch}`
  const nextMinor = `${major}.${minor + 1}.0`
  const nextMajor = `${major + 1}.0.0`

  if (op === '^') {
    // npm's caret: compatible within the left-most non-zero field.
    if (major > 0 || !minorGiven)
      return [
        { op: '>=', version: at },
        { op: '<', version: nextMajor },
      ]
    if (minor > 0 || !patchGiven)
      return [
        { op: '>=', version: at },
        { op: '<', version: nextMinor },
      ]
    return [
      { op: '>=', version: at },
      { op: '<', version: `${major}.${minor}.${patch + 1}` },
    ]
  }
  if (op === '~') {
    return [
      { op: '>=', version: at },
      { op: '<', version: minorGiven ? nextMinor : nextMajor },
    ]
  }
  if (op) return [{ op: op as Comparator['op'], version: at }]
  // A bare partial pins its prefix: `1.2` is `1.2.x`, `1` is `1.x`.
  if (patchGiven) return [{ op: '=', version: at }]
  return [
    { op: '>=', version: at },
    { op: '<', version: minorGiven ? nextMinor : nextMajor },
  ]
}

/**
 * Whether a spec is an evaluable version RANGE (as opposed to an exact version,
 * a dist-tag, a path or a protocol spec).
 *
 * @param value - A dependency spec from a manifest or a caller.
 * @returns True when {@link satisfiesVersionRange} can answer for it.
 */
export function isVersionRange(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed === '' || EXACT_VERSION.test(trimmed)) return false
  return trimmed
    .split('||')
    .map((alternative: string) => alternative.trim())
    .filter((alternative: string) => alternative !== '')
    .every((alternative: string) => {
      const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(alternative)
      if (hyphen)
        return parseComparator(hyphen[1]!) !== null && parseComparator(hyphen[2]!) !== null
      const tokens = alternative.split(/\s+/).filter((token: string) => token !== '')
      return tokens.length > 0 && tokens.every((token: string) => parseComparator(token) !== null)
    })
}

/**
 * The comparators of one `||` alternative, expanded.
 *
 * @param alternative - One alternative of a range (hyphen ranges included).
 * @returns The comparators that must all hold.
 */
function alternativeComparators(alternative: string): Comparator[] | null {
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(alternative)
  if (hyphen) {
    const low = parseComparator(hyphen[1]!)
    const high = parseComparator(hyphen[2]!)
    if (!low || !high || low.length === 0 || high.length === 0) return null
    // `1.2.3 - 2.3.4` is `>=1.2.3 <=2.3.4`; a partial bound keeps npm's meaning
    // (`1.2 - 2.3` ends below 2.4.0), which `parseComparator` already encodes.
    const from: Comparator = { op: '>=', version: low[0]!.version }
    const to: Comparator =
      high.length === 1
        ? { op: '<=', version: high[0]!.version }
        : { op: '<', version: high[high.length - 1]!.version }
    return [from, to]
  }
  const comparators: Comparator[] = []
  for (const token of alternative.split(/\s+/).filter(Boolean)) {
    const parsed = parseComparator(token)
    if (!parsed) return null
    comparators.push(...parsed)
  }
  return comparators
}

/**
 * Whether `version` is one of the versions `range` accepts.
 *
 * Conservative by construction: a non-range spec, an unparseable comparator, or
 * a prerelease `version` answers false. A false answer means "not shown to
 * satisfy", so callers refuse rather than bind bytes to a schema the range
 * might not select.
 *
 * @param range - An npm-style version range.
 * @param version - An exact version to test.
 * @returns True when every comparator of some alternative holds for `version`.
 */
export function satisfiesVersionRange(range: string, version: string): boolean {
  if (!EXACT_VERSION.test(version) || version.includes('-')) return false
  const alternatives = range
    .split('||')
    .map((alternative: string) => alternative.trim())
    .filter((alternative: string) => alternative !== '')
  if (alternatives.length === 0) return false
  return alternatives.some((alternative: string) => {
    const comparators = alternativeComparators(alternative)
    if (!comparators) return false
    return comparators.every((comparator) => {
      const order = compareVersions(version, comparator.version)
      switch (comparator.op) {
        case '>=':
          return order >= 0
        case '>':
          return order > 0
        case '<=':
          return order <= 0
        case '<':
          return order < 0
        case '=':
          return order === 0
      }
    })
  })
}

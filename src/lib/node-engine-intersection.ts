import type { Comparator, SemVer } from 'semver'
import semver from 'semver'

interface Bound {
  version: SemVer
  inclusive: boolean
}

interface Interval {
  lower: Bound
  upper?: Bound
}

interface Branches {
  stable: Interval[]
  prereleases: Map<string, Interval[]>
}

function stableVersion(version: SemVer): SemVer {
  return new semver.SemVer(`${version.major}.${version.minor}.${version.patch}`)
}

function nextStableVersion(version: SemVer): SemVer | undefined {
  const { major, minor, patch } = version
  const max = Number.MAX_SAFE_INTEGER
  if (patch < max) return new semver.SemVer(`${major}.${minor}.${patch + 1}`)
  if (minor < max) return new semver.SemVer(`${major}.${minor + 1}.0`)
  if (major < max) return new semver.SemVer(`${major + 1}.0.0`)
  return undefined
}

function compareLower(a: Bound, b: Bound): number {
  return a.version.compare(b.version) || Number(b.inclusive) - Number(a.inclusive)
}

function compareUpper(a?: Bound, b?: Bound): number {
  if (!a) return b ? 1 : 0
  if (!b) return -1
  return a.version.compare(b.version) || Number(a.inclusive) - Number(b.inclusive)
}

function hasVersions({ lower, upper }: Interval): boolean {
  if (!upper) return true
  const order = lower.version.compare(upper.version)
  if (order === 0) return lower.inclusive && upper.inclusive
  if (order > 0) return false
  // In the prerelease order, appending .0 gives the immediate successor.
  return (
    lower.inclusive || upper.inclusive || upper.version.version !== `${lower.version.version}.0`
  )
}

function intersect(a: Interval, b: Interval): Interval {
  return {
    lower: compareLower(a.lower, b.lower) < 0 ? b.lower : a.lower,
    upper: compareUpper(a.upper, b.upper) < 0 ? a.upper : b.upper,
  }
}

function intersectUnions(a: Interval[], b: Interval[]): Interval[] {
  const intersections: Interval[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    const intersection = intersect(a[i], b[j])
    if (hasVersions(intersection)) intersections.push(intersection)
    const next = compareUpper(a[i].upper, b[j].upper)
    if (next <= 0) i++
    if (next >= 0) j++
  }
  return intersections
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const merged: Interval[] = []
  for (const current of intervals.sort((a, b) => compareLower(a.lower, b.lower))) {
    const previous = merged.at(-1)
    if (!previous) {
      merged.push(current)
      continue
    }
    if (!previous.upper) continue
    const order = previous.upper.version.compare(current.lower.version)
    const touches = order === 0 && (previous.upper.inclusive || current.lower.inclusive)
    const consecutive =
      previous.upper.inclusive &&
      current.lower.inclusive &&
      current.lower.version.version === `${previous.upper.version.version}.0`
    if (order > 0 || touches || consecutive) {
      merged[merged.length - 1] = {
        lower: previous.lower,
        upper: compareUpper(previous.upper, current.upper) < 0 ? current.upper : previous.upper,
      }
    } else {
      merged.push(current)
    }
  }
  return merged
}

const zero = new semver.SemVer('0.0.0')
const first = new semver.SemVer('0.0.0-0')

function comparatorInterval(comparators: readonly Comparator[]): Interval {
  let result: Interval = { lower: { version: first, inclusive: true } }
  for (const { operator, semver: version } of comparators) {
    if (!(version instanceof semver.SemVer)) continue
    const bound: Bound = { version, inclusive: operator !== '<' && operator !== '>' }
    const restriction: Interval = {
      lower: operator.startsWith('<') ? { version: first, inclusive: true } : bound,
      upper: operator.startsWith('>') ? undefined : bound,
    }
    result = intersect(result, restriction)
  }
  return result
}

function stableInterval(interval: Interval): Interval | undefined {
  const { lower, upper } = interval
  const from =
    lower.inclusive || lower.version.prerelease.length
      ? stableVersion(lower.version)
      : nextStableVersion(lower.version)
  if (!from) return undefined
  const until =
    upper &&
    (upper.inclusive && !upper.version.prerelease.length
      ? nextStableVersion(upper.version)
      : stableVersion(upper.version))
  return {
    lower: { version: from, inclusive: true },
    upper: until && { version: until, inclusive: false },
  }
}

function partition(range: semver.Range): Branches {
  const stable: Interval[] = []
  const prereleases = new Map<string, Interval[]>()
  for (const comparators of range.set) {
    const interval = comparatorInterval(comparators)
    if (!hasVersions(interval)) continue
    const stablePart = stableInterval(interval)
    if (stablePart && hasVersions(stablePart)) stable.push(stablePart)

    // npm admits a prerelease only when its comparator set explicitly mentions
    // the same major, minor, and patch in a prerelease comparator.
    const tuples = new Set<string>()
    for (const { semver: version } of comparators) {
      if (version instanceof semver.SemVer && version.prerelease.length) {
        tuples.add(stableVersion(version).version)
      }
    }
    for (const tuple of tuples) {
      const part = intersect(interval, {
        lower: { version: new semver.SemVer(`${tuple}-0`), inclusive: true },
        upper: { version: new semver.SemVer(tuple), inclusive: false },
      })
      if (!hasVersions(part)) continue
      const alternatives = prereleases.get(tuple) ?? []
      alternatives.push(part)
      prereleases.set(tuple, alternatives)
    }
  }
  for (const [tuple, intervals] of prereleases) prereleases.set(tuple, mergeIntervals(intervals))
  return { stable: mergeIntervals(stable), prereleases }
}

function intersectBranches(a: Branches, b: Branches): Branches {
  const prereleases = new Map<string, Interval[]>()
  for (const [tuple, intervals] of a.prereleases) {
    const matches = b.prereleases.get(tuple)
    if (!matches) continue
    const intersection = intersectUnions(intervals, matches)
    if (intersection.length) prereleases.set(tuple, intersection)
  }
  return { stable: intersectUnions(a.stable, b.stable), prereleases }
}

function printInterval({ lower, upper }: Interval, stableUpper: boolean): string {
  if (upper?.inclusive && lower.inclusive && lower.version.compare(upper.version) === 0) {
    return lower.version.version
  }
  const minimum =
    lower.version.compare(zero) === 0
      ? ''
      : `${lower.inclusive ? '>=' : '>'}${lower.version.version}`
  const maximum = upper
    ? `${upper.inclusive ? '<=' : '<'}${upper.version.version}${stableUpper ? '-0' : ''}`
    : ''
  return [minimum, maximum].filter(Boolean).join(' ') || '*'
}

/** Compute the Node versions allowed by every exact scaffold pin's npm engine range. */
export function intersectNodeEngineRanges(requirements: ReadonlyMap<string, string>): string {
  let common: Branches | undefined
  for (const [pin, expression] of requirements) {
    let range: semver.Range
    try {
      range = new semver.Range(expression)
    } catch (cause) {
      throw new Error(`Invalid Node engine range for ${pin}: ${expression}`, { cause })
    }
    const branches = partition(range)
    common = common ? intersectBranches(common, branches) : branches
  }
  if (!common) return '*'

  const output = common.stable.map((interval) => {
    const tuple = interval.lower.version.version
    const prereleases = common.prereleases.get(tuple)
    const last = prereleases?.at(-1)
    if (last?.upper?.version.version === tuple) {
      prereleases?.pop()
      interval = { ...interval, lower: last.lower }
    }
    const printed = printInterval(interval, true)
    // A wildcard branch makes node-semver drop every other alternative, including prereleases.
    const range = printed === '*' && common.prereleases.size ? '0.0.0 || >=0.0.1' : printed
    return { lower: interval.lower, range }
  })
  for (const intervals of common.prereleases.values()) {
    for (const interval of intervals) {
      output.push({ lower: interval.lower, range: printInterval(interval, false) })
    }
  }
  if (!output.length) {
    const pins = [...requirements].map(([pin, range]) => `${pin} (${range})`).join(', ')
    throw new Error(`The scaffold pins have no common Node version: ${pins}`)
  }
  return output
    .sort((a, b) => compareLower(a.lower, b.lower))
    .map(({ range }) => range)
    .join(' || ')
}

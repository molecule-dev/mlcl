import semver from 'semver'
import { describe, expect, it } from 'vitest'

import { intersectNodeEngineRanges } from '../node-engine-intersection.js'

function intersection(...ranges: string[]): string {
  return intersectNodeEngineRanges(new Map(ranges.map((range, i) => [`pin-${i + 1}@1.0.0`, range])))
}

describe('the intersection of scaffold Node engines', () => {
  it('preserves the gaps between Angular’s supported Node lines', () => {
    const angular = '^22.22.3 || ^24.15.0 || >=26.0.0'
    expect(intersection('>=22.12.0', angular, angular)).toBe(
      '>=22.22.3 <23.0.0-0 || >=24.15.0 <25.0.0-0 || >=26.0.0',
    )
  })

  it('drops branches below other pins and merges overlapping and adjacent stable ranges', () => {
    expect(intersection('^20.19.0 || >=22.12.0', '>=22')).toBe('>=22.12.0')
    expect(intersection('>=24 || ^22 || 23.x || >22.0.0 <25')).toBe('>=22.0.0')
    expect(intersection('>22.0.0 <=22.0.3', '22.x')).toBe('>=22.0.1 <22.0.4-0')
  })

  it('keeps prereleases only if every requirement permits that tuple', () => {
    expect(intersection('>=22.12.0-rc.1 <23', '>=22.0.0')).toBe('>=22.12.0 <23.0.0-0')
    expect(intersection('>=22.12.0-rc.1 <23', '^22.12.0-rc.2')).toBe('>=22.12.0-rc.2 <23.0.0-0')
    expect(intersection('>=22.12.0-rc.1 <22.12.0', '22.12.0-rc.2')).toBe('22.12.0-rc.2')
  })

  it('keeps an exact prerelease alongside a stable range that covers every release', () => {
    const original = '<22.12.0 || >=22.12.0-rc.1'
    const result = intersection(original)
    expect(semver.satisfies('0.0.0', result)).toBe(true)
    expect(semver.satisfies('22.12.0-rc.1', result)).toBe(true)
    expect(semver.satisfies('22.12.0-beta.1', result)).toBe(false)
    expect(semver.satisfies('22.13.0-rc.1', result)).toBe(false)
  })

  it('checks the emitted range against the original comparator sets', () => {
    const cases = [
      ['>=22.12.0', '^22.22.3 || ^24.15.0 || >=26.0.0'],
      ['^22.12.0-rc.1 || >=24.15.0-rc.1 <25', '>=22.12.0-rc.2 <24 || 24.15.x'],
      ['>=22.12.0-rc.1 <22.12.0 || 24.15.0-beta.1', '>=22.12.0-rc.2 <22.12.0 || 24.15.0-beta.1'],
      ['24.15.0-rc.1 || >=24.15.0-rc.1.0 <24.15.0', '>=24.15.0-rc.1 <24.15.0'],
      ['22.12.0 - 24.15.0', '~22.12.0 || >24.14.0'],
      ['<22.12.0 || >=22.12.0-rc.1', '>=0.0.0-0 <24.15.0 || >=24.15.0'],
    ]
    const versions = [
      '0.0.0',
      '0.0.0-0',
      '0.0.1',
      '21.9.9',
      '22.0.0',
      '22.12.0',
      '22.12.1',
      '22.22.3',
      '23.0.0',
      '24.14.0',
      '24.14.1',
      '24.15.0',
      '24.15.1',
      '25.0.0',
      '26.0.0',
      '27.1.2',
    ]
    for (const ranges of cases) {
      const result = intersection(...ranges)
      for (const version of versions) {
        for (const suffix of ['', '-0', '-beta.1', '-rc.1', '-rc.1.0', '-rc.2']) {
          if (suffix && version.includes('-')) continue
          const candidate = `${version}${suffix}`
          expect(semver.satisfies(candidate, result), `${candidate} in ${result}`).toBe(
            ranges.every((range) => semver.satisfies(candidate, range)),
          )
        }
      }
    }
  })

  it('reports incompatible and invalid constraints with their pin names', () => {
    expect(() => intersection('>=22', '<22')).toThrow(
      'The scaffold pins have no common Node version: pin-1@1.0.0 (>=22), pin-2@1.0.0 (<22)',
    )
    expect(() => intersection('>22.12.0-rc.1 <22.12.0-rc.1.0')).toThrow('no common Node version')
    expect(() => intersection('>=22.12.0-rc.1 <22.12.0', '*')).toThrow('no common Node version')
    expect(() => intersection('>=22', 'not an engine')).toThrow(
      'Invalid Node engine range for pin-2@1.0.0: not an engine',
    )
  })

  it('can return an unconstrained stable range when the input is empty or wildcard', () => {
    expect(intersection()).toBe('*')
    expect(intersection('*', '>=0.0.0')).toBe('*')
  })
})

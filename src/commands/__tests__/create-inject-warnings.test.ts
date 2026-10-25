/**
 * `create` runs `inject` as a CHILD with `stdio: 'pipe'`, so a successful
 * scaffold used to drop every warning the injector raised — including "the copy
 * mlcl read is 1.0.0, so its dependency metadata was not written", the note that
 * explains a 2.0.0 pin beside a 1.0.0 copy's peers (r10 acceptance review, F11).
 *
 * The child's stderr is forwarded through `injectWarningLines`, which keeps only
 * oclif's warning lines: spinners, progress and ordinary output stay captured.
 */
import { describe, expect, it } from 'vitest'

import { injectWarningLines } from '../create.js'

describe('injectWarningLines', () => {
  it('returns the message of a warning line, without oclif’s prefix or colour', () => {
    const stderr = ' ›   \u001b[33mWarning: \u001b[39m@molecule/api-x is pinned at 2.0.0\n'
    expect(injectWarningLines(stderr)).toEqual(['@molecule/api-x is pinned at 2.0.0'])
  })

  it('keeps every warning and drops spinner frames and progress lines', () => {
    const stderr = [
      '\u001b[?25l│',
      '◇  Planning',
      ' ›   Warning: first',
      '    |   cd proj',
      ' ›   Warning: second (with a suffix)',
      '\u001b[?25h│',
    ].join('\n')
    expect(injectWarningLines(stderr)).toEqual(['first', 'second (with a suffix)'])
  })

  it('re-joins a warning oclif wrapped over several lines (the actionable part must survive)', () => {
    const stderr = [
      ' ›   Warning: @molecule/api-x is pinned at 2.0.0 but the copy mlcl ',
      ' ›   read is 1.0.0 (/tmp/nm/@molecule/api-x), so its third-party ',
      ' ›   dependencies were NOT copied. Run `npm install`.',
      '\u001b[?25h│',
      '│',
    ].join('\n')
    expect(injectWarningLines(stderr)).toEqual([
      '@molecule/api-x is pinned at 2.0.0 but the copy mlcl read is 1.0.0 ' +
        '(/tmp/nm/@molecule/api-x), so its third-party dependencies were NOT ' +
        'copied. Run `npm install`.',
    ])
  })

  it('ends a warning at the next non-continuation line', () => {
    expect(
      injectWarningLines([' ›   Warning: one', '│', '◇  Done', ' ›   Warning: two'].join('\n')),
    ).toEqual(['one', 'two'])
  })

  it('returns nothing when the child printed no warning', () => {
    expect(injectWarningLines('')).toEqual([])
    expect(injectWarningLines('│\n◇  Injected\n    | done\n')).toEqual([])
  })
})

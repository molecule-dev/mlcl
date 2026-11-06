import { describe, expect, it } from 'vitest'

import { singlePackResult } from './npm-pack-json.js'

const result = {
  id: 'fx@1.0.0',
  name: 'fx',
  filename: 'fx-1.0.0.tgz',
  files: [{ path: 'package.json', size: 49 }],
  size: 179,
  unpackedSize: 52,
}

describe('singlePackResult', () => {
  it('reads npm 11 output, an array holding the one result', () => {
    expect(singlePackResult(JSON.stringify([result])).filename).toBe('fx-1.0.0.tgz')
  })

  it('reads npm 12 output, the result keyed by package name', () => {
    // npm 12.2.2 prints `{ "fx": { … } }`; reading it as an array left filename undefined.
    expect(singlePackResult(JSON.stringify({ fx: result })).filename).toBe('fx-1.0.0.tgz')
  })

  it('reads a bare result object', () => {
    expect(singlePackResult(JSON.stringify(result)).files).toEqual(result.files)
  })

  it('refuses no result, two results and a result without a file list', () => {
    expect(() => singlePackResult('[]')).toThrow('returned 0 results')
    expect(() => singlePackResult(JSON.stringify({ a: result, b: result }))).toThrow(
      'returned 2 results',
    )
    expect(() => singlePackResult(JSON.stringify([{ filename: 'fx-1.0.0.tgz' }]))).toThrow(
      'did not return a file list',
    )
  })
})

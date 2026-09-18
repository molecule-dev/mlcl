import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EXPORT_FORMAT,
  EXPORT_FORMAT_KEY,
  readDefaultExportFormat,
} from '../lib/export-format.js'

// The default export format (Settings → Export, localStorage 'versal.defaultExportFormat') was persisted
// but the Editor's Export CTA hardcoded format:'md', so the choice had no effect. readDefaultExportFormat
// is the shared reader the Editor now uses; it also guards to the backend-producible set (md/txt/html).

const fakeStore = (val: string | null): Pick<Storage, 'getItem'> => ({
  getItem: (k: string) => (k === EXPORT_FORMAT_KEY ? val : null),
})

describe('readDefaultExportFormat', () => {
  it('returns the default when unavailable or unset', () => {
    expect(readDefaultExportFormat(undefined)).toBe(DEFAULT_EXPORT_FORMAT)
    expect(readDefaultExportFormat(fakeStore(null))).toBe(DEFAULT_EXPORT_FORMAT)
  })

  it('returns a stored producible format', () => {
    expect(readDefaultExportFormat(fakeStore('md'))).toBe('md')
    expect(readDefaultExportFormat(fakeStore('txt'))).toBe('txt')
    expect(readDefaultExportFormat(fakeStore('html'))).toBe('html')
  })

  it('falls back to the default for formats the backend cannot produce', () => {
    // pdf/docx were offered by the old Settings picker but the backend rejects them.
    expect(readDefaultExportFormat(fakeStore('pdf'))).toBe(DEFAULT_EXPORT_FORMAT)
    expect(readDefaultExportFormat(fakeStore('docx'))).toBe(DEFAULT_EXPORT_FORMAT)
    expect(readDefaultExportFormat(fakeStore('exe'))).toBe(DEFAULT_EXPORT_FORMAT)
  })
})

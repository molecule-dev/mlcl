import { describe, expect, it } from 'vitest'

import { resolveRagSettings } from '../lib/rag-settings.js'

// The Settings "Retrieval defaults" (users.oauthData.rag) were persisted but never read — retrieval
// hardcoded top_k=5, ingest chunking hardcoded 350 words with no overlap. resolveRagSettings reads
// the stored values (clamped to the UI ranges) with sensible defaults.

const withRag = (rag?: { retrievalK?: number; chunkSize?: number; chunkOverlap?: number }) => ({
  oauthData: { rag },
})

describe('resolveRagSettings', () => {
  it('returns the stored retrievalK, chunkSize, and chunkOverlap', () => {
    expect(
      resolveRagSettings(withRag({ retrievalK: 12, chunkSize: 800, chunkOverlap: 64 })),
    ).toEqual({ retrievalK: 12, chunkSize: 800, chunkOverlap: 64 })
  })

  it('falls back to defaults (5 / 350 / 0) when unset', () => {
    const defaults = { retrievalK: 5, chunkSize: 350, chunkOverlap: 0 }
    expect(resolveRagSettings(withRag({}))).toEqual(defaults)
    expect(resolveRagSettings({ oauthData: null })).toEqual(defaults)
    expect(resolveRagSettings(null)).toEqual(defaults)
    expect(resolveRagSettings(undefined)).toEqual(defaults)
  })

  it('clamps to the UI ranges (retrievalK 1–32, chunkSize 50–2048, chunkOverlap 0–512)', () => {
    expect(
      resolveRagSettings(withRag({ retrievalK: 999, chunkSize: 99999, chunkOverlap: 9999 })),
    ).toEqual({ retrievalK: 32, chunkSize: 2048, chunkOverlap: 512 })
    expect(resolveRagSettings(withRag({ retrievalK: 0, chunkSize: 1, chunkOverlap: -5 }))).toEqual({
      retrievalK: 1,
      chunkSize: 50,
      chunkOverlap: 0,
    })
  })

  it('ignores non-numeric values, using the defaults', () => {
    expect(
      resolveRagSettings(withRag({ retrievalK: NaN, chunkSize: undefined, chunkOverlap: NaN })),
    ).toEqual({ retrievalK: 5, chunkSize: 350, chunkOverlap: 0 })
  })
})

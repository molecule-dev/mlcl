import { describe, expect, it } from 'vitest'

import { chunkText } from '../lib/chunking.js'

// chunkText took a maxOverlapWords arg that the Settings "Chunk overlap" preference now feeds.
// Overlap carries the tail of each chunk into the next so retrieval near a boundary isn't lost.
// Three 3-word paragraphs with a 3-word cap => three chunks; with overlap they share their tails.
const TEXT = 'alpha beta gamma\n\ndelta epsilon zeta\n\neta theta iota'

describe('chunkText overlap', () => {
  it('produces non-overlapping chunks by default (overlap = 0)', () => {
    const chunks = chunkText(TEXT, 3)
    expect(chunks.map((c) => c.body_text)).toEqual([
      'alpha beta gamma',
      'delta epsilon zeta',
      'eta theta iota',
    ])
  })

  it('carries the previous chunk tail into the next when overlap is set', () => {
    const chunks = chunkText(TEXT, 3, 2)
    // Each later chunk is prefixed with the last 2 words of the prior chunk.
    expect(chunks.map((c) => c.body_text)).toEqual([
      'alpha beta gamma',
      'beta gamma\n\ndelta epsilon zeta',
      'epsilon zeta\n\neta theta iota',
    ])
  })

  it('re-indexes chunks sequentially and never emits a pure-overlap trailing chunk', () => {
    const chunks = chunkText(TEXT, 3, 2)
    expect(chunks.map((c) => c.chunk_index)).toEqual([0, 1, 2])
    // The last chunk must contain genuinely new content, not just carried overlap.
    expect(chunks[chunks.length - 1].body_text).toContain('eta theta iota')
  })

  it('clamps an overlap >= the chunk cap so ingestion still terminates', () => {
    const chunks = chunkText(TEXT, 3, 999)
    // Overlap clamped to cap-1 (2); still a finite, sensible chunk set.
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.length).toBeLessThanOrEqual(4)
    expect(chunks[0].body_text).toBe('alpha beta gamma')
  })
})

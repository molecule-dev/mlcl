/**
 * Resolve a user's stored RAG "Retrieval defaults" (Settings → users.oauthData.rag).
 *
 * These were persisted by the Settings form but never read: the Q&A retrieval hardcoded top_k=5 and
 * the ingest chunker hardcoded 350 words, so changing the settings did nothing. This reads the
 * stored values, clamped to the same ranges the UI enforces, and falls back to the defaults.
 */

export interface RagSettings {
  /** Number of chunks to retrieve per query (UI range 1–32). */
  retrievalK: number
  /** Max words per chunk at ingest (UI range 50–2048). */
  chunkSize: number
  /** Words of overlap carried between consecutive chunks at ingest (UI range 0–512). */
  chunkOverlap: number
}

const DEFAULTS: RagSettings = { retrievalK: 5, chunkSize: 350, chunkOverlap: 0 }

const clampInt = (value: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback
}

export interface UserWithRag {
  oauthData?: { rag?: { retrievalK?: number; chunkSize?: number; chunkOverlap?: number } } | null
}

/** The user's stored retrieval settings, clamped to valid ranges (defaults when unset/invalid). */
export function resolveRagSettings(user: UserWithRag | null | undefined): RagSettings {
  const rag = user?.oauthData?.rag
  return {
    retrievalK: clampInt(rag?.retrievalK, 1, 32, DEFAULTS.retrievalK),
    chunkSize: clampInt(rag?.chunkSize, 50, 2048, DEFAULTS.chunkSize),
    chunkOverlap: clampInt(rag?.chunkOverlap, 0, 512, DEFAULTS.chunkOverlap),
  }
}

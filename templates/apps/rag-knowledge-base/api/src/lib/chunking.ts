/**
 * Document chunking and FTS-based retrieval helpers.
 *
 * pgvector is intentionally NOT used here — when the extension is not
 * installed, the migration silently no-ops. Instead we lean on
 * PostgreSQL's built-in full-text search (`tsvector` + `ts_rank_cd`)
 * indexed in `0013_rag_knowledge_base_document_chunks.sql` to retrieve
 * the most relevant excerpts for a question.
 *
 * If you swap in pgvector later, only the `retrieveRelevantChunks`
 * implementation has to change — the chunk shape stays the same.
 */

import { create, query } from '@molecule/api-database'

export interface DocumentChunk {
  body_text: string
  chunk_index: number
  page_number?: number | null
  heading?: string | null
  token_count?: number
}

export interface RetrievedChunk {
  id: string
  document_id: string
  chunk_index: number
  body_text: string
  heading: string | null
  page_number: number | null
  document_title: string
  document_mime: string | null
  rank: number
}

/**
 * Split a markdown / plain-text body into ~500-token chunks. We respect
 * paragraph boundaries (double newlines), then fall back to sentences,
 * then to a hard word-count cap, so chunks never split mid-sentence
 * unless the sentence itself is longer than the cap.
 *
 * Empirically 400-800 tokens per chunk strikes a good balance for FTS
 * retrieval — small enough to be a useful citation, big enough that
 * `ts_rank_cd` doesn't favour single-keyword matches.
 */
export function chunkText(
  text: string,
  maxWordsPerChunk = 350,
  maxOverlapWords = 0,
): DocumentChunk[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim()
  if (!cleaned) return []

  // Words of overlap carried from each chunk into the next (clamped below the
  // chunk cap so ingestion always makes progress). 0 = no overlap.
  const overlap = Math.max(0, Math.min(Math.floor(maxOverlapWords) || 0, maxWordsPerChunk - 1))

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const chunks: DocumentChunk[] = []
  let buffer: string[] = []
  let bufferWordCount = 0
  let chunkIndex = 0
  let currentHeading: string | null = null
  // Words in `buffer` that are carried-over overlap (not new content) — flush()
  // must never emit a chunk that is pure overlap.
  let carriedWords = 0

  const flush = (): void => {
    if (!buffer.length) return
    if (bufferWordCount <= carriedWords) return
    const body = buffer.join('\n\n').trim()
    if (!body) return
    chunks.push({
      body_text: body,
      chunk_index: chunkIndex,
      heading: currentHeading,
      token_count: Math.ceil(body.split(/\s+/).length * 1.3),
    })
    chunkIndex += 1
    if (overlap > 0) {
      // Seed the next chunk with the tail of this one so retrieval near a
      // boundary isn't lost.
      const words = body.split(/\s+/)
      const tail = words.slice(Math.max(0, words.length - overlap))
      buffer = tail.length ? [tail.join(' ')] : []
      bufferWordCount = tail.length
      carriedWords = tail.length
    } else {
      buffer = []
      bufferWordCount = 0
      carriedWords = 0
    }
  }

  for (const paragraph of paragraphs) {
    // Detect markdown headings to attach to subsequent chunks for nicer citations.
    const headingMatch = paragraph.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      flush()
      currentHeading = headingMatch[1].trim()
      // Don't index a heading on its own — wait for the body that follows.
      continue
    }

    const words = paragraph.split(/\s+/).length
    if (bufferWordCount + words > maxWordsPerChunk && buffer.length) {
      flush()
    }

    if (words > maxWordsPerChunk) {
      // Sentence-level fallback for very long paragraphs.
      const sentences = paragraph
        .split(/(?<=[.!?])\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter(Boolean)
      for (const sentence of sentences) {
        const sWords = sentence.split(/\s+/).length
        if (bufferWordCount + sWords > maxWordsPerChunk && buffer.length) {
          flush()
        }
        buffer.push(sentence)
        bufferWordCount += sWords
        if (bufferWordCount >= maxWordsPerChunk) flush()
      }
    } else {
      buffer.push(paragraph)
      bufferWordCount += words
    }
  }
  flush()

  return chunks
}

export async function indexDocumentChunks(
  documentId: string,
  userId: string,
  chunks: DocumentChunk[],
): Promise<void> {
  const now = new Date()
  for (const chunk of chunks) {
    await create('document_chunks', {
      document_id: documentId,
      user_id: userId,
      chunk_index: chunk.chunk_index,
      body_text: chunk.body_text,
      heading: chunk.heading ?? null,
      page_number: chunk.page_number ?? null,
      token_count: chunk.token_count ?? 0,
      created_at: now,
    })
  }
}

export async function deleteChunksForDocument(documentId: string): Promise<void> {
  await query(`DELETE FROM document_chunks WHERE document_id = $1`, [documentId])
}

/**
 * Count of all chunks owned by the user — useful for surfacing "X chunks
 * indexed across N documents" headline metrics on the dashboard.
 */
export async function countUserChunks(userId: string): Promise<number> {
  const result = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM document_chunks WHERE user_id = $1`,
    [userId],
  )
  return Number(result.rows[0]?.n ?? 0)
}

/**
 * FTS retrieval: return the top-K chunks that match the question,
 * scoped to the calling user. Joins back to the parent `documents`
 * row so the caller can build human-readable citations.
 */
/**
 * Tiny English stop-word list — questions like "what is the refund
 * policy?" overweight `is` / `the` / `?` and starve the rank function
 * if they aren't pruned. This is intentionally conservative: we only
 * drop function words, not domain terms.
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'so',
  'such',
  'that',
  'the',
  'their',
  'them',
  'they',
  'this',
  'to',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'you',
  'your',
])

function buildOrTsQuery(question: string): string {
  const tokens = question
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  if (!tokens.length) return ''
  // OR the terms together so a question like "What is our SLA?"
  // matches any chunk containing the word "SLA" — the rank function
  // still favors chunks that match more terms.
  return tokens.join(' | ')
}

export async function retrieveRelevantChunks(
  userId: string,
  question: string,
  limit = 5,
): Promise<RetrievedChunk[]> {
  const tsq = buildOrTsQuery(question)
  if (!tsq) return []
  const result = await query<RetrievedChunk>(
    `SELECT
       c.id,
       c.document_id,
       c.chunk_index,
       c.body_text,
       c.heading,
       c.page_number,
       d.title  AS document_title,
       d.mime   AS document_mime,
       ts_rank_cd(to_tsvector('english', c.body_text), to_tsquery('english', $2)) AS rank
     FROM document_chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE c.user_id = $1
       AND to_tsvector('english', c.body_text) @@ to_tsquery('english', $2)
     ORDER BY rank DESC
     LIMIT $3`,
    [userId, tsq, limit],
  )
  return result.rows
}

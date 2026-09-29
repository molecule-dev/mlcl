/**
 * Which blocks of a post an AI wrote — from the coding-agent transcripts the
 * post was written with.
 *
 * Put a post's transcript exports in `content/transcripts/<slug>/` (Claude
 * Code `/export` text or session `.jsonl`, Codex Markdown export or rollout
 * `.jsonl`, a Molecule IDE conversation's JSON — any mix). The build then
 * writes `dist/<slug>/provenance.json`: each top-level block of the post as
 * `human` or `ai`, with the prompt (as the person typed it) and the model
 * behind every `ai` block, plus the post's AI word share. A post without a
 * transcripts folder gets one too, every block `human` (`humanProvenance`);
 * files in the folder that are not transcripts are skipped. An `ai` block
 * whose transcript names no model fails the build, naming the file: a Codex
 * Markdown export never records one, so use that session's rollout `.jsonl`.
 *
 * The attribution is `@molecule/api-text-provenance` with its word-overlap bond;
 * the transcripts are read by `@molecule/api-agent-transcript-autodetect`. To
 * show provenance on a page, call `postProvenance()` from src/pages.ts —
 * `spans[i]` lines up with `markdownBlocks(post.markdown)[i]`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  canReadTranscript,
  readTranscript,
  setProvider as setTranscriptReader,
} from '@molecule/api-agent-transcript'
import { provider as anyTranscript } from '@molecule/api-agent-transcript-autodetect'
import { attributeText, setProvider as setAttribution } from '@molecule/api-text-provenance'
import { provider as wordOverlap } from '@molecule/api-text-provenance-overlap'

setTranscriptReader(anyTranscript)
setAttribution(wordOverlap)

/**
 * What a model name looks like: a known model family somewhere in it
 * (claude-opus-5-5, gpt-6-sol, deepseek-flash, gemini-3-pro…). An agent or app
 * name (Synthase, Claude Code, Codex, Cursor) is not one. Add a family here
 * when a transcript names a model it does not cover.
 */
export const MODEL_NAME =
  /claude|sonnet|opus|haiku|fable|gpt|\bo[1-9]\b|deepseek|gemini|gemma|llama|qwen|glm|kimi|moonshot|mistral|mixtral|codestral|grok|phi-|command-r|nova|minimax|yi-|ernie|hunyuan|doubao/i

/** One block of the post, in page order. `prompt` and `model` are on every ai span. */
export interface ProvenanceSpan {
  /** The block's markdown: a paragraph, heading, list or code block. */
  text: string
  origin: 'human' | 'ai'
  /** The person's message the AI was answering, as typed. */
  prompt?: string
  /** The model that wrote it, as the transcript names it. */
  model?: string
}

/** What `/<slug>/provenance.json` holds. */
export interface Provenance {
  /** 0..1, the share of the post's words the AI wrote. */
  aiShare: number
  words: number
  aiWords: number
  /** The distinct prompts behind the ai spans, in page order. */
  prompts: string[]
  spans: ProvenanceSpan[]
}

/**
 * A post's top-level blocks: front matter dropped, split on blank lines, never
 * inside a code fence.
 *
 * @param markdown - The post file, front matter included or not.
 * @returns The blocks, in order.
 */
export function markdownBlocks(markdown: string): string[] {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  const blocks: string[] = []
  let lines: string[] = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(`{3}|~{3})/.test(line)) inFence = !inFence
    if (!inFence && line.trim() === '') {
      if (lines.length > 0) blocks.push(lines.join('\n'))
      lines = []
    } else {
      lines.push(line)
    }
  }
  if (lines.length > 0) blocks.push(lines.join('\n'))
  return blocks
}

/**
 * Attribute one post from its markdown and the folder holding its transcripts.
 *
 * @param markdown - The post file's text.
 * @param transcriptDir - The folder of transcript exports.
 * @returns The post's provenance.
 */
export function postProvenance(markdown: string, transcriptDir: string): Provenance {
  const blocks = markdownBlocks(markdown)
  const files = readdirSync(transcriptDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()
  const sessions = files
    .map((name) => ({ text: readFileSync(join(transcriptDir, name), 'utf8'), fileName: name }))
    .filter((input) => canReadTranscript(input))
    .map((input) => readTranscript(input))
  const result = attributeText({ paragraphs: blocks, sessions })
  // Every ai span names its model. A transcript that records none (a Codex
  // Markdown export never does) fails the build here, naming the file, rather
  // than publishing an ai paragraph with no model.
  const unnamed = result.paragraphs.filter((p) => p.origin === 'ai' && !p.model)
  if (unnamed.length > 0) {
    const from = files.filter((name) =>
      unnamed.some((p) =>
        readFileSync(join(transcriptDir, name), 'utf8').includes((p.prompt ?? '').slice(0, 60)),
      ),
    )
    throw new Error(
      `${transcriptDir}: ${unnamed.length} ai paragraph(s) came from a transcript that names no model (${from.join(', ') || 'unknown file'}). ` +
        'Use an export that records the model: for Codex, the session rollout .jsonl (its turn_context carries the model), not the Markdown export.',
    )
  }
  // A model name is the MODEL's, not the agent's: "Prompt · Synthase" tells a
  // reader nothing true (X0 x408, 2026-09-29, and x324's "synthase-1": a
  // transcript written by hand with the agent's name, through five fix rounds).
  const notModels = [
    ...new Set(
      result.paragraphs
        .filter((p) => p.origin === 'ai' && p.model && !MODEL_NAME.test(p.model))
        .map((p) => p.model),
    ),
  ]
  if (notModels.length > 0) {
    throw new Error(
      `${transcriptDir}: ${notModels.map((m) => `"${m}"`).join(', ')} is not a model name — a prompt is labelled with the model that answered it (e.g. deepseek-flash, claude-opus-5-5, gpt-6-sol), never the agent or app. ` +
        'On molecule.dev your own conversation is /workspace/.molecule/session.json, and each assistant message there carries its model: copy it into this directory as the transcript rather than writing one by hand.',
    )
  }
  return {
    aiShare: result.aiShare,
    words: result.words,
    aiWords: result.aiWords,
    prompts: result.prompts,
    spans: result.paragraphs.map((p): ProvenanceSpan => {
      const text = blocks[p.index] ?? ''
      return p.origin === 'ai'
        ? { text, origin: 'ai', prompt: p.prompt, model: p.model }
        : { text, origin: 'human' }
    }),
  }
}

/**
 * The provenance of a post with no transcripts: every block written by a person.
 *
 * @param markdown - The post file's text.
 * @returns The post's provenance, AI share 0.
 */
export function humanProvenance(markdown: string): Provenance {
  const spans = markdownBlocks(markdown).map((text): ProvenanceSpan => ({ text, origin: 'human' }))
  const words = spans.reduce((n, s) => n + (s.text.match(/\S+/g)?.length ?? 0), 0)
  return { aiShare: 0, words, aiWords: 0, prompts: [], spans }
}

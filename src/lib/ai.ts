/**
 * AI code generation module — wraps the Anthropic SDK for molecule code generation.
 *
 * Used in Phase 2 (Assembly) to generate wiring code from README.md context.
 * Off unless the caller turns it on (`mlcl inject --ai`, {@link enableAI}) AND
 * ANTHROPIC_API_KEY is set: each request is billed to that key and adds seconds
 * to an injection, and the heuristics write the same files (every scaffold uses
 * them). A key in the environment alone is not a request for it: coding agents
 * such as Claude Code run with one for their own use.
 *
 * @module
 */

import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic()
  }
  return _client
}

/** Whether this process asked for AI code generation (`--ai`). */
let _aiEnabled = false

/**
 * Check if AI code generation was asked for and has a key to use.
 */
export function isAIAvailable(): boolean {
  return _aiEnabled && !!process.env.ANTHROPIC_API_KEY
}

/**
 * Turn on AI code generation for this process (`mlcl inject --ai`). It is used
 * only while ANTHROPIC_API_KEY is set.
 */
export function enableAI(): void {
  _aiEnabled = true
}

/**
 * Turn AI code generation off for this process: `isAIAvailable()` returns false
 * and all generation uses the heuristics.
 */
export function disableAI(): void {
  _aiEnabled = false
}

/**
 * Extract a code block from AI response text.
 * Looks for ```typescript or ```ts fenced blocks, falls back to raw text.
 */
function extractCodeBlock(text: string): string {
  const match = text.match(/```(?:typescript|ts)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : text.trim()
}

/**
 * Generate code using Claude.
 *
 * @param systemPrompt - System instructions for the AI
 * @param context - Package context (README.md content, metadata, etc.)
 * @param task - The specific code generation task
 * @returns Generated code string
 */
export async function generateCode(
  systemPrompt: string,
  context: string,
  task: string,
): Promise<string> {
  const client = getClient()

  const message = await client.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          // Cache breakpoint at the end of the SHARED prefix (system renders
          // before messages, so this caches system + context together). The
          // varying task stays after it — a top-level cache_control would
          // auto-place on the last block and cache nothing reusable across
          // a batch.
          { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: task },
        ],
      },
    ],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected AI response type: ' + block.type)
  }

  return extractCodeBlock(block.text)
}

/**
 * Generate code with multiple parallel tasks.
 * Each task gets the same system prompt and context, but different task descriptions.
 *
 * @param systemPrompt - System instructions for the AI
 * @param context - Shared package context
 * @param tasks - Array of { key, task } pairs
 * @returns Map of key -> generated code
 */
export async function generateCodeBatch(
  systemPrompt: string,
  context: string,
  tasks: Array<{ key: string; task: string }>,
): Promise<Map<string, string>> {
  const results = await Promise.all(
    tasks.map(async ({ key, task }) => {
      const code = await generateCode(systemPrompt, context, task)
      return [key, code] as const
    }),
  )
  return new Map(results)
}

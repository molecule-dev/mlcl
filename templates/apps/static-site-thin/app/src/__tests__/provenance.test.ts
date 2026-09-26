import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { postProvenance } from '../provenance.js'

const paragraph =
  'The tempting shortcut is to ask a model which paragraphs look AI-written. The build instead measures word overlap between each paragraph and what the agent wrote, which is repeatable and needs no second model.'

const post = `---\ntitle: Overlap\n---\n\n${paragraph}\n`

let dir: string | undefined
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('postProvenance', () => {
  it('fails the build when an ai paragraph comes from a transcript with no model, naming the file', () => {
    dir = mkdtempSync(join(tmpdir(), 'prov-'))
    writeFileSync(
      join(dir, 'codex-session.md'),
      `# Codex conversation\n\n## User\n\nWrite the paragraph about measuring word overlap instead of asking a model.\n\n## Assistant\n\n${paragraph}\n`,
    )
    expect(() => postProvenance(post, dir!)).toThrow(/names no model \(codex-session\.md\)/)
  })

  it('attributes a paragraph from a transcript that names its model', () => {
    dir = mkdtempSync(join(tmpdir(), 'prov-'))
    writeFileSync(
      join(dir, 'molecule-ide-export.json'),
      JSON.stringify({
        projectId: 'p',
        aiContext: 'blog',
        createdAt: '2026-09-26T00:00:00Z',
        messages: [
          {
            role: 'user',
            content: 'Write the paragraph about measuring word overlap.',
            timestamp: '2026-09-26T00:00:00Z',
          },
          {
            role: 'assistant',
            model: 'claude-sonnet-4-5',
            timestamp: '2026-09-26T00:00:10Z',
            content: paragraph,
          },
        ],
      }),
    )
    const result = postProvenance(post, dir)
    const ai = result.spans.filter((s) => s.origin === 'ai')
    expect(ai.length).toBeGreaterThan(0)
    for (const s of ai) expect(s.model).toBe('claude-sonnet-4-5')
  })
})

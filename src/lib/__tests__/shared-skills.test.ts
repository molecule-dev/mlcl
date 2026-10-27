/**
 * The shared skill workflow is authored ONCE and delivered through two loading
 * paths, so these tests guard the source and the copies — not the prose.
 *
 *   - canonical: `templates/.agents/skills/<name>/SKILL.md` — read at scaffold
 *     time by molecule-dev and written into every sandbox
 *     (`loadTemplateSkills`); the sandbox is where a weak executor decides
 *     whether to hand-roll a capability or reuse a package.
 *   - copies: the Claude Code plugin and this repo's own `.agents/skills`, for
 *     harnesses that never run that scaffold.
 *
 * A copy edited on its own is the drift this file fails on.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const SKILLS_ROOT = join(MLCL_ROOT, 'templates', '.agents', 'skills')

/** Directories beside the shared skills that are corpora, not skills. */
const RESERVED = new Set(['patterns', 'examples'])

/** The host copies every shared skill must have (see scripts/sync-shared-skills.mjs). */
const HOST_COPY_TEMPLATES = [
  (name: string): string =>
    join(
      MLCL_ROOT,
      'integrations',
      'claude-code',
      'plugins',
      'molecule',
      'skills',
      name,
      'SKILL.md',
    ),
  (name: string): string => join(MLCL_ROOT, '.agents', 'skills', name, 'SKILL.md'),
]

/** Skill directories authored in the canonical tree. */
function sharedSkillNames(): string[] {
  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !RESERVED.has(entry.name))
    .filter((entry) => existsSync(join(SKILLS_ROOT, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
}

function frontmatter(markdown: string): string {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return match?.[1] ?? ''
}

describe('shared skills — one authored source, host copies in lockstep', () => {
  const names = sharedSkillNames()

  it('authors at least the capability-first workflow', () => {
    expect(names).toContain('capability-first')
  })

  for (const name of names) {
    const canonical = readFileSync(join(SKILLS_ROOT, name, 'SKILL.md'), 'utf8')

    describe(name, () => {
      it('has frontmatter a harness can index without loading the body', () => {
        const fm = frontmatter(canonical)
        // Discovery matches the directory name, so a mismatched `name:` means
        // the skill is listed under one name and described under another.
        expect(fm).toMatch(new RegExp(`^name: ${name}$`, 'm'))
        const description = fm.match(/^description: (.+)$/m)?.[1]?.trim() ?? ''
        expect(description.length, 'a description is what makes it discoverable').toBeGreaterThan(
          40,
        )
        // Harness frontmatter is loaded for every session; an essay there costs
        // context in every project. Claude Code's skill description cap is 1024.
        expect(description.length).toBeLessThan(1024)
        expect(description, 'one line only').not.toContain('\n')
      })

      it('keeps the sandbox-safe boundary — no VM, credential or release steps', () => {
        // This file ships into a user's project sandbox and is read by an
        // executing agent. A coarse net over the internal-only words, not a
        // proof: anything shaped like our own operations belongs in a host-only
        // doc, never here.
        for (const leak of [
          'flyctl',
          '/home/l/',
          'molecule-dev/api',
          'NPM_TOKEN',
          '.env.flagship',
          'production API',
        ]) {
          expect(canonical, `"${leak}" must not reach an end-user sandbox`).not.toContain(leak)
        }
      })

      it('state the reuse order, not just "prefer packages"', () => {
        // The order IS the guidance: a rule that only says "prefer a package"
        // leaves the model free to copy one, fork one, or invent a package for
        // a one-off helper.
        const headings = ['Inspect', 'Reuse', 'Adapt', 'Create']
        const positions = headings.map((h) => canonical.search(new RegExp(`## \\d\\. ${h}`)))
        for (const [i, pos] of positions.entries()) {
          expect(pos, `the order names step ${headings[i]}`).toBeGreaterThan(-1)
        }
        expect(positions).toEqual([...positions].sort((a, b) => a - b))
        expect(canonical).toMatch(/Counterexamples/)
        expect(canonical).toMatch(/composition root/i)
      })

      for (const pathFor of HOST_COPY_TEMPLATES) {
        const copy = pathFor(name)
        const relative = copy.slice(MLCL_ROOT.length + 1)
        it(`host copy is byte-identical: ${relative}`, () => {
          expect(
            existsSync(copy),
            `${relative} is missing — run node scripts/sync-shared-skills.mjs`,
          ).toBe(true)
          expect(
            readFileSync(copy, 'utf8'),
            `${relative} drifted from the canonical skill — run node scripts/sync-shared-skills.mjs`,
          ).toBe(canonical)
        })
      }
    })
  }
})

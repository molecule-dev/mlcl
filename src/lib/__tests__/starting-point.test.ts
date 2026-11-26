/**
 * Every surface another harness reads about starting a new app states the same rule: a flagship
 * template only when its catalog covers the core of the request and it is the right size for it,
 * otherwise a custom stack. The rule is Synthase's own starting-point selection; before it was
 * shared, these surfaces told harnesses to "pick the closest template", and a harness that found
 * no close one hand-built its project.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderCliCommands } from '#cli-command'
import { describe, expect, it } from 'vitest'

import { LIST_TEMPLATES_DESCRIPTION, serverInstructions } from '../../../mcp/src/instructions.js'
import { startingPointMarkdown } from '../starting-point.js'

const MLCL = join(import.meta.dirname, '..', '..', '..')
const read = (path: string): string => readFileSync(join(MLCL, path), 'utf8')

/** Wording that sends a harness to a template that does not fit (the rules themselves say "not because it is the closest match"). */
const TEMPLATE_FIRST =
  /pick the closest|closest (flagship )?template|\(preferred\)|fastest starting point|Prefer a flagship|None close/i

describe('starting-point rules', () => {
  it('appear verbatim in the conventions section, its MCP copy and the build skill', () => {
    const block = startingPointMarkdown('   ')
    for (const path of [
      'templates/shared/agent-init-section.md.tpl',
      'mcp/assets/conventions.md',
      'templates/host-skills/build-with-molecule/SKILL.md',
    ]) {
      expect(renderCliCommands(read(path)), path).toContain(block)
    }
  })

  it('leave no surface telling a harness to take the closest template', () => {
    for (const path of [
      'templates/shared/agent-init-section.md.tpl',
      'templates/host-skills/build-with-molecule/SKILL.md',
      'README.md',
      'docs/AGENTS-AND-HARNESSES.md',
      'mcp/src/server.ts',
      'mcp/src/remote.ts',
    ]) {
      expect(read(path), path).not.toMatch(TEMPLATE_FIRST)
    }
    for (const face of ['local', 'hosted'] as const) {
      const text = serverInstructions(face)
      expect(text).not.toMatch(TEMPLATE_FIRST)
      expect(text).toContain('covers the core of the request')
    }
    expect(LIST_TEMPLATES_DESCRIPTION).toContain('`slug`')
    expect(LIST_TEMPLATES_DESCRIPTION).toContain('covers the core of the request')
  })

  it('give README and the harness guide the same paste-anywhere block', () => {
    const block = (path: string): string => {
      const text = read(path)
      const start = text.indexOf('Build this app with molecule.dev:')
      expect(start, path).toBeGreaterThan(-1)
      return text.slice(start, text.indexOf('```', start))
    }
    expect(block('docs/AGENTS-AND-HARNESSES.md')).toBe(block('README.md'))
    expect(block('README.md')).toContain('npx mlcl templates <slug>')
  })
})

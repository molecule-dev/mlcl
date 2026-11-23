// @vitest-environment node
/**
 * Off a terminal, a command's spinner prints each step once as a plain line. clack's own spinner
 * redraws its frame with cursor escapes, and a harness reading `mlcl add --inject` got a dozen
 * `\x1b[1G\x1b[J◒  Executing injection` copies in its context (2026-11-23). Every command takes its
 * spinner from `createSpinner`, which the scan below holds them to.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createSpinner } from '../spinner.js'

const COMMANDS = join(import.meta.dirname, '..', '..', 'commands')

function captured(): { text: () => string; write: (s: string) => void; isTTY: false } {
  let out = ''
  return { text: () => out, write: (s) => void (out += s), isTTY: false }
}

describe('createSpinner off a terminal', () => {
  it('prints each start and end once, with no cursor escapes', () => {
    const out = captured()
    const spinner = createSpinner(out)
    spinner.start('Executing injection')
    spinner.message('still going')
    spinner.stop('Injection complete')
    spinner.start('Validating')
    spinner.error('Validation failed')
    expect(out.text()).toBe(
      'Executing injection…\nInjection complete\nValidating…\nValidation failed\n',
    )
    expect(out.text()).not.toContain('\x1b')
  })

  it('prints nothing for a step without a message, and records a cancel', () => {
    const out = captured()
    const spinner = createSpinner(out)
    spinner.start()
    spinner.stop()
    expect(out.text()).toBe('')
    expect(spinner.isCancelled).toBe(false)
    spinner.cancel('Cancelled')
    expect(spinner.isCancelled).toBe(true)
    expect(out.text()).toBe('Cancelled\n')
  })
})

describe('commands', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? entry.name === '__tests__'
          ? []
          : files(join(dir, entry.name))
        : entry.name.endsWith('.ts')
          ? [join(dir, entry.name)]
          : [],
    )

  it('take their spinner from createSpinner, never from @clack/prompts', () => {
    const all = files(COMMANDS)
    expect(all.length).toBeGreaterThan(20)
    const direct = all.filter((file) =>
      /\bp\.spinner\(|\{[^}]*\bspinner\b[^}]*\}\s*from\s*'@clack\/prompts'/.test(
        readFileSync(file, 'utf8'),
      ),
    )
    expect(direct).toEqual([])
  })
})

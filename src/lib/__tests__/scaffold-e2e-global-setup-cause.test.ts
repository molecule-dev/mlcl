/**
 * The scaffolded `e2e/global-setup.ts` must attach the caught error as the
 * symptom's `cause`.
 *
 * `globalSetup` turns a failed probe into "Nothing answers at <url>" so the run
 * fails in seconds instead of spending every navigation timeout. It re-threw a
 * bare `new Error(message)`, which discards the original `fetch` failure — so
 * the real reason (DNS, TLS, a refused connection on the wrong port) never
 * reached the run, and the emitted file failed the scaffold's own lint:
 * `preserve-caught-error` reported "There is no `cause` attached to the symptom
 * error being thrown" for every generated app that lints `e2e/`.
 *
 * The template at `templates/app/shared/e2e/global-setup.ts.tpl` is copied into
 * every app scaffold, and each flagship template also carries its own copy at
 * `templates/apps/<slug>/e2e/global-setup.ts`. Both halves must stay identical
 * or a scaffold from one path ships what the other one fixed.
 *
 * @module
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates')
const SHARED = join(TEMPLATES, 'app', 'shared', 'e2e', 'global-setup.ts.tpl')

/** The symptom construction, with and without the attached cause. */
const WITH_CAUSE = `        'dev server is already running on port 5173.',\n      { cause: error },\n    )`
const WITHOUT_CAUSE = `        'dev server is already running on port 5173.',\n    )`

/** Flagship template slugs under `templates/apps/`. */
async function flagshipSlugs(): Promise<string[]> {
  const entries = await readdir(join(TEMPLATES, 'apps'), { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

describe('the scaffolded e2e global setup preserves the caught error', () => {
  it('the shared template attaches the fetch failure as the cause', async () => {
    const template = await readFile(SHARED, 'utf-8')
    expect(template).toContain('catch (error)')
    expect(template).toContain(WITH_CAUSE)
    // The bare rethrow is the shape that discarded the stack and failed
    // `preserve-caught-error`; its return means the original error is lost again.
    expect(template).not.toContain(WITHOUT_CAUSE)
  })

  it('every flagship template carries the same fixed body', async () => {
    const template = await readFile(SHARED, 'utf-8')
    const slugs = await flagshipSlugs()
    expect(slugs.length).toBeGreaterThan(0)

    const drift: string[] = []
    for (const slug of slugs) {
      const copy = await readFile(join(TEMPLATES, 'apps', slug, 'e2e', 'global-setup.ts'), 'utf-8')
      if (copy !== template) drift.push(slug)
    }
    expect(drift).toEqual([])
  })
})

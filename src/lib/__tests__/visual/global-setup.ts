/**
 * Starts one showcase dev server per framework, once for the whole visual run, and stops them
 * after it.
 *
 * Playwright starts a new worker after a failed test and runs a file's `beforeAll` again in it, so
 * servers started there were installed and started again after every failure (and the old ones
 * still held their ports). A global setup runs once per run; the workers read the servers'
 * addresses from `MOLECULE_SHOWCASE_URLS`.
 *
 * The run's environment decides which showcases start and where their `@molecule/*` packages come
 * from (`MOLECULE_SHOWCASE_FRAMEWORKS`, `MOLECULE_SHOWCASE_PACKAGES`: ../../visual-test.js). CI
 * sets both: one framework beside React, installed from npm.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createShowcaseProject,
  showcaseFrameworks,
  showcasePort,
  type ShowcaseProject,
  startShowcaseServer,
  stopShowcaseServers,
} from '../../visual-test.js'

/** The environment variable that carries each framework's showcase address to the workers. */
export const SHOWCASE_URLS_ENV = 'MOLECULE_SHOWCASE_URLS'

/**
 * Create and start the run's showcases: every framework's, or React's and the ones
 * `MOLECULE_SHOWCASE_FRAMEWORKS` names.
 *
 * @returns The teardown, which stops the servers and removes the projects.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const baseDir = await mkdtemp(join(tmpdir(), 'molecule-visual-'))
  const projects: ShowcaseProject[] = []
  const teardown = async (): Promise<void> => {
    stopShowcaseServers(projects)
    await rm(baseDir, { recursive: true, force: true })
  }
  try {
    for (const framework of showcaseFrameworks(process.env.MOLECULE_SHOWCASE_FRAMEWORKS)) {
      // Said at the start, so a slow or failed install is attributed to its showcase in the log.
      console.log(`▸ ${framework}: installing and starting its showcase`)
      const projectDir = await createShowcaseProject(framework, baseDir)
      projects.push(await startShowcaseServer(projectDir, framework, showcasePort(framework)))
    }
  } catch (error) {
    await teardown()
    throw error
  }
  process.env[SHOWCASE_URLS_ENV] = JSON.stringify(
    Object.fromEntries(projects.map((project) => [project.framework, project.url])),
  )
  return teardown
}

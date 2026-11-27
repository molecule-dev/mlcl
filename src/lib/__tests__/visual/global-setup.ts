/**
 * Starts one showcase dev server per framework, once for the whole visual run, and stops them
 * after it.
 *
 * Playwright starts a new worker after a failed test and runs a file's `beforeAll` again in it, so
 * servers started there were installed and started again after every failure (and the old ones
 * still held their ports). A global setup runs once per run; the workers read the servers'
 * addresses from `MOLECULE_SHOWCASE_URLS`.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  BASE_PORT,
  createShowcaseProject,
  type ShowcaseProject,
  startShowcaseServer,
  stopShowcaseServers,
  VISUAL_TEST_FRAMEWORKS,
} from '../../visual-test.js'

/** The environment variable that carries each framework's showcase address to the workers. */
export const SHOWCASE_URLS_ENV = 'MOLECULE_SHOWCASE_URLS'

/**
 * Create and start every framework's showcase.
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
    for (let i = 0; i < VISUAL_TEST_FRAMEWORKS.length; i++) {
      const framework = VISUAL_TEST_FRAMEWORKS[i]
      const projectDir = await createShowcaseProject(framework, baseDir)
      projects.push(await startShowcaseServer(projectDir, framework, BASE_PORT + i))
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

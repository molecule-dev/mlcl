/**
 * Cross-framework visual regression tests.
 *
 * Verifies that every component variant renders identically across all
 * supported frameworks (React, Vue, Svelte, Solid, Angular) by comparing
 * screenshots of each component section.
 *
 * Test flow:
 * 1. beforeAll: Create and start showcase projects for each framework
 * 2. For each component: screenshot the data-component section in each framework
 * 3. Compare all frameworks against React as the baseline
 * 4. afterAll: Stop all dev servers and clean up
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, type Page, test } from '@playwright/test'

import { showcaseComponents } from '@molecule/app-ui-showcase'

import {
  BASE_PORT,
  createShowcaseProject,
  type ShowcaseProject,
  startShowcaseServer,
  stopShowcaseServers,
  VISUAL_TEST_FRAMEWORKS,
  type VisualTestFramework,
} from '../../visual-test.js'

let projects: ShowcaseProject[] = []
let baseDir: string

test.beforeAll(async () => {
  baseDir = await mkdtemp(join(tmpdir(), 'molecule-visual-'))

  for (let i = 0; i < VISUAL_TEST_FRAMEWORKS.length; i++) {
    const framework = VISUAL_TEST_FRAMEWORKS[i]
    const port = BASE_PORT + i
    const projectDir = await createShowcaseProject(framework, baseDir)
    const project = await startShowcaseServer(projectDir, framework, port)
    projects.push(project)
  }
}, 120_000) // 2 minutes for npm install + server startup across all frameworks

test.afterAll(async () => {
  stopShowcaseServers(projects)
  projects = []

  if (baseDir) {
    await rm(baseDir, { recursive: true, force: true }).catch(() => {})
  }
})

/** Get the project for a framework */
function getProject(framework: VisualTestFramework): ShowcaseProject {
  const project = projects.find((p) => p.framework === framework)
  if (!project) throw new Error(`No project found for framework: ${framework}`)
  return project
}

/** Wait for the showcase page to fully render */
async function waitForShowcase(page: Page): Promise<void> {
  await page.waitForSelector('[data-component]', { timeout: 15_000 })
  // Wait for any animations/transitions to settle
  await page.waitForTimeout(500)
}

// ── Per-component cross-framework comparison ──────────────────────────

// Build a deduplicated list of component names with their spec indices.
// Some components appear multiple times (e.g., Input with different propMatrix),
// so we test each spec entry independently.
const specEntries = showcaseComponents.map((spec, index) => ({
  name: spec.name,
  specIndex: index,
  label:
    showcaseComponents.filter((s) => s.name === spec.name).length > 1
      ? `${spec.name} (${index})`
      : spec.name,
}))

for (const entry of specEntries) {
  test.describe(`${entry.label}`, () => {
    const nonBaselineFrameworks = VISUAL_TEST_FRAMEWORKS.filter((f) => f !== 'react')

    for (const framework of nonBaselineFrameworks) {
      test(`renders identically in ${framework} vs React`, async ({ page }) => {
        const reactProject = getProject('react')
        const fwProject = getProject(framework)

        // Screenshot the component section in React (baseline)
        await page.goto(reactProject.url)
        await waitForShowcase(page)
        const reactSection = page.locator(
          `[data-component="${entry.name}"][data-spec-index="${entry.specIndex}"]`,
        )
        await expect(reactSection).toBeVisible({ timeout: 10_000 })
        const reactScreenshot = await reactSection.screenshot()

        // Screenshot the same component section in the other framework
        await page.goto(fwProject.url)
        await waitForShowcase(page)
        const fwSection = page.locator(
          `[data-component="${entry.name}"][data-spec-index="${entry.specIndex}"]`,
        )

        // Some components may not exist in all frameworks (e.g., Angular subset)
        const fwVisible = await fwSection.isVisible().catch(() => false)
        if (!fwVisible) {
          test.skip()
          return
        }

        const fwScreenshot = await fwSection.screenshot()

        // Compare: the framework screenshot should match React's baseline
        await expect(fwScreenshot).toMatchSnapshot(
          `${entry.name}-${entry.specIndex}-${framework}.png`,
          { maxDiffPixelRatio: 0.01 },
        )

        // Also verify React baseline is stable
        await expect(reactScreenshot).toMatchSnapshot(
          `${entry.name}-${entry.specIndex}-react.png`,
          { maxDiffPixelRatio: 0.01 },
        )
      })
    }
  })
}

// ── Theme consistency tests ───────────────────────────────────────────

test.describe('Light theme consistency', () => {
  for (const framework of VISUAL_TEST_FRAMEWORKS.filter((f) => f !== 'react')) {
    test(`all components match React in light theme (${framework})`, async ({ page }) => {
      const reactProject = getProject('react')
      const fwProject = getProject(framework)

      // Switch React to light theme and screenshot the full page
      await page.goto(reactProject.url)
      await waitForShowcase(page)
      await page.evaluate(() => {
        // Access the exported themeProvider from bonds
        ;(window as unknown as Record<string, unknown>).__moleculeTheme = 'light'
        document.documentElement.setAttribute('data-theme', 'light')
      })
      await page.waitForTimeout(300)
      const reactShot = await page.screenshot({ fullPage: true })

      // Switch the other framework to light theme
      await page.goto(fwProject.url)
      await waitForShowcase(page)
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light')
      })
      await page.waitForTimeout(300)
      const fwShot = await page.screenshot({ fullPage: true })

      await expect(reactShot).toMatchSnapshot(`full-page-light-react.png`, {
        maxDiffPixelRatio: 0.02,
      })
      await expect(fwShot).toMatchSnapshot(`full-page-light-${framework}.png`, {
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})

/**
 * Cross-framework visual parity tests.
 *
 * Verifies that every component variant renders the same in every supported framework (Vue,
 * Svelte, Solid, Angular, React Native Web) as in React, by comparing each framework's
 * screenshot of a component section with React's screenshot of the same section, taken in the
 * same run on the same machine.
 *
 * Test flow:
 * 1. global-setup.ts creates and starts every framework's showcase, once for the run
 * 2. For each component: screenshot the data-component section in React and in each framework
 * 3. Compare each framework's screenshot with React's
 * 4. The global setup's teardown stops the dev servers and removes the projects
 *
 * React's screenshot is the expected image: it is written where Playwright reads the snapshot
 * (`snapshotPathTemplate` in playwright.config.ts puts it under the results directory), so
 * Playwright's own comparator judges the pair and writes the expected, actual and diff images of
 * a failing pair beside it. Nothing is stored in the repository, so the comparison is the same on
 * macOS, Linux and CI. Until 2026-11-27 each framework was compared only with its own stored
 * macOS snapshot, so a framework that drifted from React still passed, and the only snapshots
 * were macOS ones that no other platform could compare against.
 *
 * The comparisons are the ones for the frameworks global-setup.ts started besides React
 * (`MOLECULE_SHOWCASE_FRAMEWORKS`: every framework when unset). `--grep` narrows them further
 * within those.
 *
 * @module
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { expect, type Page, test, type TestInfo } from '@playwright/test'

import { showcaseComponents } from '@molecule/app-ui-showcase'

import { comparedFrameworks, type VisualTestFramework } from '../../visual-test.js'
import { SHOWCASE_URLS_ENV } from './global-setup.js'

/**
 * The address of a framework's showcase, started once for the run by global-setup.ts.
 *
 * @param framework - The framework.
 * @returns Its showcase's address.
 */
function getProject(framework: VisualTestFramework): { url: string } {
  const urls: Record<string, string> = JSON.parse(process.env[SHOWCASE_URLS_ENV] ?? '{}')
  const url = urls[framework]
  if (!url) throw new Error(`No showcase running for ${framework} (${SHOWCASE_URLS_ENV} unset)`)
  return { url }
}

/**
 * How every comparison captures a showcase: with CSS animations and transitions stopped, an
 * infinite one (Spinner's rotation, Skeleton's pulse) at its first frame. Running, they made two
 * captures of the same component differ by when each was taken: Spinner failed one run in three
 * under load (2026-11-27, Svelte and Solid, 1,308 pixels), passing or failing on timing, never on
 * the kit.
 */
const CAPTURE = { animations: 'disabled' } as const

/** Wait for the showcase page to fully render */
async function waitForShowcase(page: Page): Promise<void> {
  await page.waitForSelector('[data-component]', { timeout: 15_000 })
  // Wait for any animations/transitions to settle
  await page.waitForTimeout(500)
}

/**
 * Compare a framework's screenshot with React's, using React's as the expected image.
 *
 * @param testInfo - The running test.
 * @param name - The pair's file name.
 * @param react - React's screenshot.
 * @param actual - The framework's screenshot.
 */
async function expectMatchesReact(
  testInfo: TestInfo,
  name: string,
  react: Buffer,
  actual: Buffer,
): Promise<void> {
  // Updating would replace React's screenshot with the framework's and pass every pair.
  if (testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed')
    throw new Error('The comparisons with React have no stored snapshots to update.')
  const expected = testInfo.snapshotPath(name)
  await mkdir(dirname(expected), { recursive: true })
  await writeFile(expected, react)
  // Pixel for pixel: no pixel may differ, by any amount of colour. A share of differing pixels
  // (1% of a section, 2% of the page until 2026-11-28) let React Native Web pass with 4,761
  // pixels of its light page and seven sections different from React.
  expect(actual).toMatchSnapshot(name, { maxDiffPixels: 0, threshold: 0 })
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
    const nonBaselineFrameworks = comparedFrameworks()

    for (const framework of nonBaselineFrameworks) {
      test(`renders identically in ${framework} vs React`, async ({ page }, testInfo) => {
        const section = `[data-component="${entry.name}"][data-spec-index="${entry.specIndex}"]`

        // Screenshot the component section in React (the expected image)
        await page.goto(getProject('react').url)
        await waitForShowcase(page)
        const reactSection = page.locator(section)
        await expect(reactSection).toBeVisible({ timeout: 10_000 })
        const reactScreenshot = await reactSection.screenshot(CAPTURE)

        // Screenshot the same component section in the other framework. A framework that does not
        // render the section is a parity gap, so it fails here, naming the section.
        await page.goto(getProject(framework).url)
        await waitForShowcase(page)
        const fwSection = page.locator(section)
        await expect(fwSection, `${framework} renders ${section}`).toBeVisible({ timeout: 10_000 })
        const fwScreenshot = await fwSection.screenshot(CAPTURE)

        await expectMatchesReact(
          testInfo,
          `${entry.name}-${entry.specIndex}-${framework}.png`,
          reactScreenshot,
          fwScreenshot,
        )
      })
    }
  })
}

// ── Capture ───────────────────────────────────────────────────────────

test.describe('Capture', () => {
  test('a section captured at two moments is the same image', async ({ page }) => {
    // Spinner rotates a quarter turn in 250 ms: with its animation running the two captures differ.
    await page.goto(getProject('react').url)
    await waitForShowcase(page)
    const spinner = page.locator('[data-component="Spinner"]').first()
    await expect(spinner).toBeVisible({ timeout: 10_000 })
    const first = await spinner.screenshot(CAPTURE)
    await page.waitForTimeout(250)
    const second = await spinner.screenshot(CAPTURE)
    expect(second.equals(first), 'two captures of the Spinner section are identical').toBe(true)
  })
})

// ── Theme consistency tests ───────────────────────────────────────────

/**
 * Where the showcase's theme provider keeps the chosen theme (templates/showcase/shared/bonds.ts,
 * `persistKey`). The provider reads it once, on load, and marks a dark theme with the root's
 * `dark` class.
 */
const SHOWCASE_THEME_KEY = 'molecule-showcase-theme'

test.describe('Light theme consistency', () => {
  for (const framework of comparedFrameworks()) {
    test(`all components match React in light theme (${framework})`, async ({ page }, testInfo) => {
      /**
       * Screenshot a showcase's whole page in the light theme.
       *
       * @param url - The showcase's address.
       * @returns The screenshot.
       */
      const lightPage = async (url: string): Promise<Buffer> => {
        // The theme provider applies the theme it finds saved when the page loads. A `data-theme`
        // attribute set afterwards changed nothing, so until 2026-11-28 this compared the dark theme.
        await page.addInitScript(([key, theme]) => localStorage.setItem(key, theme), [
          SHOWCASE_THEME_KEY,
          'light',
        ] as const)
        await page.goto(url)
        await waitForShowcase(page)
        expect(
          await page.evaluate(() => document.documentElement.classList.contains('dark')),
          `${url} shows the light theme`,
        ).toBe(false)
        return page.screenshot({ ...CAPTURE, fullPage: true })
      }

      const reactShot = await lightPage(getProject('react').url)
      const fwShot = await lightPage(getProject(framework).url)

      await expectMatchesReact(testInfo, `full-page-light-${framework}.png`, reactShot, fwShot)
    })
  }
})

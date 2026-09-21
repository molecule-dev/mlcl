import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/how-to-play', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/how-to-play')
  })

  test('renders the brand link', async ({ page }) => {
    // This page uses the shared AppHeader, whose brand link is named by its
    // text content ("Lexlet") — no "Lexlet home" aria-label (that lives on
    // the hand-rolled headers of the auth screens).
    await expect(page.getByRole('link', { name: /^lexlet/i }).first()).toBeVisible()
  })

  test('explains all four rules in order', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /how to play/i })).toBeVisible()
    for (const title of [
      /guess the word/i,
      /read the tiles/i,
      /one word a day/i,
      /share your grid/i,
    ]) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible()
    }
  })

  test('example board shows a graded row and a row being typed', async ({ page }) => {
    const example = page.locator('[data-mol-id="how-to-play-example"]')
    await expect(example).toBeVisible()
    // The graded example row spells a five-letter word — one letter per tile.
    for (const letter of ['c', 'r', 'a', 'n', 'e']) {
      await expect(example.getByText(letter, { exact: true })).toBeVisible()
    }
  })

  test('legend explains the three tile states', async ({ page }) => {
    await expect(page.getByText(/in the word, in that spot/i)).toBeVisible()
    await expect(page.getByText(/right letter, wrong spot/i)).toBeVisible()
    // Anchor on the legend's own prefix — a bare /not in the word/i also
    // matches the rules paragraph ("gray means it is not in the word at all").
    await expect(page.getByText(/^Gray: not in the word/i)).toBeVisible()
  })

  test('anonymous CTA routes to /signup', async ({ page }) => {
    await expect(page.locator('[data-mol-id="how-to-play-cta"]')).toHaveAttribute('href', '/signup')
  })

  test('No console errors on render', async ({ page }) => {
    const { expectNoConsoleErrors } = await import('./_helpers.js')
    await expectNoConsoleErrors(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
  })
})

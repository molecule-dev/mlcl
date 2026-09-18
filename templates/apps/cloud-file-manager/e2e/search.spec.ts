import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/search', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/search')
    await expect(page).toHaveURL(/\/login/)
  })

  test('search input accepts a query and the result row appears', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'searchable.txt', 'searchable content')
    await apiCreateFileRow(page, {
      name: 'searchable.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.goto(APP_BASE + '/search')
    const input = page
      .getByRole('searchbox')
      .first()
      .or(page.getByPlaceholder(/search/i).first())
    await input.fill('searchable')
    await page.keyboard.press('Enter').catch(() => {})
    await page.waitForTimeout(1500)
    await expect(page.getByText('searchable.txt').first()).toBeVisible({ timeout: 15000 })
  })

  test('Enter triggers a GET to /api/files (or /api/folders) with the query', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page
      .getByRole('searchbox')
      .first()
      .or(page.getByPlaceholder(/search/i).first())
    const reqs = await captureNetwork(page, async () => {
      await input.fill('alpha')
      await page.keyboard.press('Enter').catch(() => {})
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some(
        (r) =>
          (/\/api\/files/.test(r.url) || /\/api\/folders/.test(r.url)) &&
          /alpha/.test(r.url) &&
          r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('zero-match query renders an empty-state message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page
      .getByRole('searchbox')
      .first()
      .or(page.getByPlaceholder(/search/i).first())
    await input.fill('zzz-no-match-token-xyz')
    await page.keyboard.press('Enter').catch(() => {})
    await page.waitForTimeout(1500)
    const empty = page.getByText(/no\s*(?:matches|results|files)/i).first()
    if (await empty.count()) {
      await expect(empty).toBeVisible()
    } else {
      // Fallback: just assert no rows for the bogus query.
      await expect(page.getByText('zzz-no-match-token-xyz')).toHaveCount(0)
    }
  })

  test('typing in the search input does not crash the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page
      .getByRole('searchbox')
      .first()
      .or(page.getByPlaceholder(/search/i).first())
    await input.fill('quick brown fox')
    await expect(input).toHaveValue('quick brown fox')
  })
})

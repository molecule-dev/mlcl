import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getFirstCollectionId, signup } from './_helpers.js'

test.describe('/collections/:id', () => {
  test('renders collection name as h1 (and fetches /api/collections)', async ({ page }) => {
    await signup(page)
    const id = await getFirstCollectionId(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/collections/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    expect(reqs.some((r) => /\/api\/collections/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('"Share" button POSTs /api/collections/:id/share (toggle visibility)', async ({ page }) => {
    await signup(page)
    const id = await getFirstCollectionId(page)
    await page.goto(APP_BASE + `/collections/${id}`)
    // The accessible name picks up the leading icon glyph text ("share Share").
    const btn = page.getByRole('button', { name: /\bShare$/i })
    await expect(btn).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await btn.click()
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/collections\/[^/]+\/share/.test(r.url) &&
          (r.method === 'POST' || r.method === 'PUT'),
      ),
    ).toBeTruthy()
  })

  test('"Edit" button reveals the rename form', async ({ page }) => {
    await signup(page)
    const id = await getFirstCollectionId(page)
    await page.goto(APP_BASE + `/collections/${id}`)
    const btn = page.getByRole('button', { name: /\bEdit$/i })
    await expect(btn).toBeVisible()
    await btn.click()
    // The rename form appears with a text input; the Save button toggles in too.
    await expect(page.getByRole('textbox')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /^Save$/i })).toBeVisible()
  })

  test('"Conjure for collection" link goes to /generate', async ({ page }) => {
    await signup(page)
    const id = await getFirstCollectionId(page)
    await page.goto(APP_BASE + `/collections/${id}`)
    await page.getByRole('link', { name: /Conjure for collection/i }).click()
    await expect(page).toHaveURL(/\/generate/)
  })

  test('clicking an image in the collection navigates to /images/:id', async ({ page }) => {
    await signup(page)
    const id = await getFirstCollectionId(page)
    await page.goto(APP_BASE + `/collections/${id}`)
    const link = page.locator('a[href^="/images/"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(/\/images\//)
  })
})

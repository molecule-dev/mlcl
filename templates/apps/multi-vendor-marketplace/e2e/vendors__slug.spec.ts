import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/vendors', () => {
  test('vendor storefront renders heading', async ({ page }) => {
    await page.goto(APP_BASE + '/vendors')
    const vendors = await page.request.get(APP_BASE + '/api/vendors')
    const body = await vendors.json()
    const slug = body.data?.find((v) => v.slug)?.slug
    test.skip(!slug, 'no vendor seeded')
    await page.goto(APP_BASE + '/vendors/' + slug)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('follow button toggles aria-pressed', async ({ page }) => {
    await page.goto(APP_BASE + '/vendors')
    const vendors = await page.request.get(APP_BASE + '/api/vendors')
    const body = await vendors.json()
    const slug = body.data?.find((v) => v.slug)?.slug
    test.skip(!slug, 'no vendor seeded')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vendors/' + slug)
      await page.waitForLoadState('networkidle')
    })
    const btn = page.getByTestId('vendor-storefront-follow')
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('message link is mailto', async ({ page }) => {
    await page.goto(APP_BASE + '/vendors')
    const vendors = await page.request.get(APP_BASE + '/api/vendors')
    const body = await vendors.json()
    const slug = body.data?.find((v) => v.slug)?.slug
    test.skip(!slug, 'no vendor seeded')
    await page.goto(APP_BASE + '/vendors/' + slug)
    await expect(page.getByTestId('vendor-storefront-message')).toHaveAttribute('href', /^mailto:/)
  })
})

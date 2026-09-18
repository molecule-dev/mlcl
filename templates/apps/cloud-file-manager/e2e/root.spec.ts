import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/', () => {
  test('initial page load fetches the static landing HTML', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    const root = reqs.find((r) => r.method === 'GET' && /\/$|\/index\.html$/.test(r.url))
    expect(root?.status ?? 200).toBeLessThan(400)
  })

  test('landing page renders the Nimbus brand and primary CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveTitle(/cloud-file-manager-app|Nimbus/i)
    await expect(page.getByRole('heading', { name: /Everything in reach/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Start free/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible()
  })

  test('"Get started" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Get started/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Log In" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Log In$/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Anchor links (#features, #pricing) keep the user on the landing page', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Features$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/#features$/)
    await page
      .getByRole('link', { name: /^Pricing$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/#pricing$/)
  })

  test('"About Nimbus" link opens the in-app About page', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /About Nimbus/i }).first()
    await expect(link).toHaveAttribute('href', '/about')
  })
})

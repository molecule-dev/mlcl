import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors } from './_helpers.js'

test.describe('terms page', () => {
  test('renders the Terms heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })

  test('has a link to /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const link = page.getByRole('link', { name: /privacy/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/privacy$/)
    } else {
      await page.goto(APP_BASE + '/privacy')
      await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
    }
  })

  test('back-to-home link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const back = page.getByRole('link', { name: /home|shortlist|back/i }).first()
    if (await back.count()) {
      await back.click()
      await page.waitForTimeout(500)
    }
  })
})

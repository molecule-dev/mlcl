import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/', () => {
  test('hero brand renders', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/Bargain/i).first()).toBeVisible()
  })

  test('Sign in nav link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('hero "Get started" CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', { name: /get started|create.*account|sign\s*up/i }).first()
    await cta.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"See pricing" CTA goes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', { name: /pricing|see\s+pricing/i }).first()
    await cta.click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('footer Sign up link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const links = page.getByRole('link', { name: /sign\s*up/i })
    await links.last().click()
    await expect(page).toHaveURL(/\/signup/)
  })
})

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('header brand link navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Driftboard/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('header Pricing link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Pricing$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('header Sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('header Get-started CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Get started$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('hero "I already have an account" navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /I already have an account/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('footer Pricing link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Pricing$/i })
      .last()
      .click()
    await expect(page).toHaveURL(/\/pricing/)
  })
})

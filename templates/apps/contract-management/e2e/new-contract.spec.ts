/**
 * /contracts/new — wizard (template → parties → variables → review).
 * Required field validation prevents send; happy path lands on detail page.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

async function clickNext(page: import('@playwright/test').Page) {
  await page
    .getByRole('button', { name: /^Next$/i })
    .first()
    .click()
}

test.describe('new contract wizard', () => {
  test('renders the template step heading + title field', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contracts/new')
    await expect(page.getByRole('heading', { name: /New contract/i })).toBeVisible()
    await expect(page.locator('#newcontract-title')).toBeVisible()
  })

  test('happy path: completes wizard and creates contract', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contracts/new')

    await page.locator('#newcontract-title').fill('E2E Smoke Contract')
    await clickNext(page)

    await page.locator('#newcontract-counterparty-name').fill('Acme E2E')
    await page.locator('#newcontract-counterparty-email').fill('signer-e2e@example.com')
    await clickNext(page)

    await page.locator('#newcontract-amount').fill('1500')
    await clickNext(page)

    await page
      .getByRole('button', { name: /Send for signature|Create/i })
      .first()
      .click()

    await page.waitForURL(/\/contracts\/(?!new)[0-9a-f-]+/, { timeout: 15_000 })
    expect(page.url()).not.toMatch(/\/contracts\/new$/)
  })

  test('blocks send without counterparty name (validation error visible)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contracts/new')

    await page.locator('#newcontract-title').fill('Validation Test')
    await clickNext(page)
    // Skip parties step (required fields blank)
    await clickNext(page)
    await clickNext(page)
    await page
      .getByRole('button', { name: /Send for signature|Create/i })
      .first()
      .click()

    await expect(page.getByRole('alert')).toBeVisible()
    expect(page.url()).toMatch(/\/contracts\/new/)
  })

  test('back button returns to /contracts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/contracts/new')
    await page
      .getByRole('link', { name: /Contracts/i })
      .first()
      .click()
    await page.waitForURL('**/contracts', { timeout: 5_000 })
  })
})

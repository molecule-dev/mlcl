import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/sell/new', () => {
  test('renders Sell an item heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sell/new')
    await expect(page.getByRole('heading', { name: /Sell an item/i, level: 1 })).toBeVisible()
  })

  test('Title field accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sell/new')
    const tb = page.getByLabel(/Title/i).first()
    await tb.fill('My new lot')
    await expect(tb).toHaveValue('My new lot')
  })

  test('Description field accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sell/new')
    const tb = page.getByLabel(/Description/i).first()
    await tb.fill('Provenance details here.')
    await expect(tb).toHaveValue('Provenance details here.')
  })

  test('Starting bid field accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sell/new')
    const sb = page.getByLabel(/Starting bid/i).first()
    await sb.fill('250')
    await expect(sb).toHaveValue('250')
  })

  test('Selecting Fine art category updates URL hash', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sell/new')
    // "Watches" is the default category and renders as an aria-current span
    // (not a button); pick a non-default category to exercise the toggle.
    await page
      .getByRole('button', { name: /Fine art/i })
      .first()
      .click()
    await expect(page).toHaveURL(/cat=art/)
  })

  test('Preview & list submits POST /api/listings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sell/new')
    await page.getByLabel(/Title/i).first().fill('Submit test lot')
    await page
      .getByLabel(/Description/i)
      .first()
      .fill('hi')
    await page
      .getByLabel(/Starting bid/i)
      .first()
      .fill('300')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /Preview & list|Submit/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => /\/api\/listings(?:\?|$)/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })
})

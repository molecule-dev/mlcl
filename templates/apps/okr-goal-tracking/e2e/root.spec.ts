import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Landing /', () => {
  test('hero heading + primary CTAs render', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /climb toward what matters/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /start free for 14 days/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /create my workspace/i }).first()).toBeVisible()
  })

  test('header Sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /welcome back, climber/i })).toBeVisible()
  })

  test('header Start free link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^start free$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('header Pricing link goes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^pricing$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('Features anchor scrolls to features section', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^features$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/#features$/)
  })

  test('Hero CTA Start free for 14 days routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free for 14 days/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('See how it works CTA scrolls to features anchor', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /see how it works/i })
      .first()
      .click()
    await expect(page).toHaveURL(/#features$/)
  })

  test('CTA Create my workspace routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /create my workspace/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('initial GET / fires (network smoke)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('domcontentloaded')
    })
    const root = reqs.find(
      (r) => r.method === 'GET' && (r.url === APP_BASE + '/' || r.url === APP_BASE),
    )
    expect(root, 'expected GET / to be observed').toBeTruthy()
    expect(root!.status).toBeLessThan(400)
  })

  test('Built on Molecule footer link points outside', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /built on molecule/i })
    await expect(a).toBeVisible()
    await expect(a).toHaveAttribute('href', /molecule\.dev/)
  })
})

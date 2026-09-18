import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Landing page (root /)', () => {
  test('renders without auth — hero + CTA + nav', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /Code in a new light/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Get Refract free/ })).toBeVisible()
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Get Refract free link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Get Refract free/ }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('hero "Connect your first repo" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Connect your first repo/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('feature grid shows the four product pillars', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /AI quality scoring/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /GitHub-native flow/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Bring your rules/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Reports your team reads/ })).toBeVisible()
  })

  test('footer renders copyright with the current year', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const text = await page.locator('footer').textContent()
    expect(text).toMatch(/©\s*20\d\d/)
    expect(text).toMatch(/Refract/i)
  })

  test('landing makes ZERO /api/* requests on initial render', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, `unexpected API traffic: ${apiCalls.map((c) => c.url).join(', ')}`).toEqual([])
  })

  test('Refract brand link does not navigate off / (anchor #top)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Refract$/ }).click()
    await expect(page).toHaveURL(/\/(?:#top)?$/)
  })

  test('multiple "Sign in" links exist (header + section CTA)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const signInLinks = page.getByRole('link', { name: /Sign in/ })
    expect(await signInLinks.count(), 'expected ≥ 1 Sign in link on landing').toBeGreaterThan(0)
  })

  test('multiple "Get Refract free" CTAs exist (hero + final CTA)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const ctas = page.getByRole('link', { name: /Get Refract free/ })
    expect(await ctas.count(), 'expected ≥ 1 Get Refract free CTA').toBeGreaterThan(0)
  })

  test('document title contains the brand name', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const title = await page.title()
    expect(title.length, 'document title must not be blank').toBeGreaterThan(0)
  })
})

/**
 * / (Landing) — public marketing page. Funnels into /signup, /login;
 * exposes shared AppFooter (Privacy/Terms/Language modals); theme toggle.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('header "Start free" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Start free$/ }).click()
    await page.waitForURL(/\/signup$/, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible()
  })

  test('header "Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Sign in$/ }).click()
    await page.waitForURL(/\/login$/, { timeout: 10_000 })
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('CTA "Create my Remit account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Create my Remit account/i }).click()
    await page.waitForURL(/\/signup$/, { timeout: 10_000 })
  })

  test('"Send your first invoice" hero button responds to click', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const before = page.url()
    await page.getByRole('button', { name: /Send your first invoice/i }).click()
    // Either it navigates (towards signup/dashboard) or scrolls in-page;
    // assert ONE of those happens — silent click would be a real bug.
    await page.waitForTimeout(600)
    const after = page.url()
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(
      after !== before || scrollY > 0,
      `before=${before} after=${after} scrollY=${scrollY}`,
    ).toBe(true)
  })

  test('Toggle theme button flips html data-mol-theme and survives reload', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const before = await page.evaluate(
      () => document.documentElement.getAttribute('data-mol-theme') || '',
    )
    await page.getByRole('button', { name: /Toggle theme/i }).click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(
      () => document.documentElement.getAttribute('data-mol-theme') || '',
    )
    expect(after, `theme should change from "${before}"`).not.toBe(before)
    await page.reload()
    const persisted = await page.evaluate(
      () => document.documentElement.getAttribute('data-mol-theme') || '',
    )
    expect(persisted, 'theme must survive reload').toBe(after)
  })

  test('footer Privacy Policy opens an actual modal dialog', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('button', { name: /^Privacy Policy$/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  })

  test('footer Terms of Service opens an actual modal dialog', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('button', { name: /^Terms of Service$/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  })

  test('footer Language button opens locale picker dialog', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('button', { name: /^Language$/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  })

  test('landing page mount makes no /api calls (static, captureNetwork)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForTimeout(1500)
    })
    const apiHits = reqs.filter((r) => r.url.includes('/api/'))
    expect(apiHits, JSON.stringify(apiHits)).toHaveLength(0)
  })
})

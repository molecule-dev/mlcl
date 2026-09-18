/**
 * / (Landing) page — public marketing page. Outcomes asserted: page
 * mounts without console errors, primary "Get started" CTA navigates
 * to /signup, "Sign in" link navigates to /login.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test('landing page mounts without console errors', async ({ page }) => {
  await expectNoConsoleErrors(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
  })
})

test('landing has primary CTA to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const cta = page
    .getByRole('link', { name: /get started|sign up|create.*account|start.*free/i })
    .first()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/signup/)
})

test('landing has secondary link to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const signin = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
  await expect(signin).toBeVisible()
  await signin.click()
  await expect(page).toHaveURL(/\/login/)
})

test('landing header brand link is /', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /verso/i }).first().click()
  await expect(page).toHaveURL(/\/$/)
})

test('landing Pricing link navigates to /pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const links = page.getByRole('link', { name: /^pricing$/i })
  await links.first().click()
  await expect(page).toHaveURL(/\/pricing/)
})

test('landing Features anchor link sets the URL hash', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /^features$/i })
    .first()
    .click()
  await expect(page).toHaveURL(/#features/)
})

test('landing About link opens the in-app About page', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const about = page.getByRole('link', { name: /^about$/i }).first()
  expect(await about.getAttribute('href')).toBe('/about')
})

test('landing footer also exposes Pricing + Sign in links', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const footer = page.locator('footer, [role="contentinfo"]').first()
  await expect(footer.getByRole('link', { name: /pricing/i })).toBeVisible()
  await expect(footer.getByRole('link', { name: /sign\s*in/i })).toBeVisible()
})

test('landing theme toggle persists across reload', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const before = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await page.waitForTimeout(150)
  const after = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  expect(after).not.toBe(before)
  await page.reload()
  const persisted = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  expect(persisted).toBe(after)
})

test('landing hero "Start your knowledge base" CTA goes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /start your knowledge base/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('landing hero "I already have an account" link goes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /I already have an account/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('landing footer "Create my workspace" CTA goes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /create my workspace/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('landing makes no failing API calls on mount', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
  })
  const failing = reqs.filter((r) => r.url.includes('/api/') && r.status >= 500)
  expect(failing, 'no /api/ 5xx errors on landing').toEqual([])
})

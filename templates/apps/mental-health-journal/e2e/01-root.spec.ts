import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

test.describe('/ (Landing)', () => {
  test('renders hero h1 without 5xx', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    await expect(
      page.getByRole('heading', { level: 1, name: /See yourself clearly/i }),
    ).toBeVisible()
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during landing',
    ).toBeUndefined()
  })

  test('Lucid logo links to /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const logo = page.getByRole('link', { name: /^Lucid$/ }).first()
    await expect(logo).toBeVisible()
    expect(await logo.getAttribute('href')).toBe('/')
  })

  test('"Sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /Sign in/i }).first()
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/login')
  })

  test('"Start journaling" link points to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /Start journaling/i })
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/signup')
  })

  test('"Begin your first entry" CTA points to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', { name: /Begin your first entry/i }).first()
    await expect(cta).toBeVisible()
    expect(await cta.getAttribute('href')).toBe('/signup')
  })

  test('"See it in action" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /See it in action/i })
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/login')
  })
})

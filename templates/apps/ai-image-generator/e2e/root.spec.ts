import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('header "Sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('header "Start creating" link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Start creating/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('marketing nav "Features" anchor scrolls to #features', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Features$/i }).click()
    await expect(page).toHaveURL(/#features$/)
  })

  test('marketing nav "Gallery" anchor scrolls to #gallery', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Gallery$/i }).click()
    await expect(page).toHaveURL(/#gallery$/)
  })

  test('marketing nav "Pricing" anchor scrolls to #pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Pricing$/i }).click()
    await expect(page).toHaveURL(/#pricing$/)
  })

  test('hero prompt textbox accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const tb = page.getByPlaceholder(/dreamscape/i)
    await tb.fill('a serene mountain at dawn')
    await expect(tb).toHaveValue('a serene mountain at dawn')
  })

  test('hero "Photoreal" style chip toggles pressed', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const btn = page.getByRole('button', { name: /^Photoreal$/i })
    // Photoreal is preselected; click Anime first then Photoreal to verify
    await page.getByRole('button', { name: /^Anime$/i }).click()
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('hero "Anime" style chip toggles pressed', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const btn = page.getByRole('button', { name: /^Anime$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('hero Generate button redirects unauthenticated user to /signup with prompt query', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await page.getByPlaceholder(/dreamscape/i).fill('a serene mountain')
    await expectNoConsoleErrors(page, async () => {
      await page.getByRole('button', { name: /^auto_awesome Generate$|^Generate$/i }).click()
      await page.waitForURL(/\/signup/, { timeout: 10000 })
    })
    expect(page.url()).toMatch(/\/signup/)
    expect(page.url()).toMatch(/prompt=/)
  })

  test('"Start free" pricing CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Start free/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Try Creator" pricing CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Try Creator/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Talk to sales" pricing CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Talk to sales/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Create your first dream" final CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Create your first dream/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })
})

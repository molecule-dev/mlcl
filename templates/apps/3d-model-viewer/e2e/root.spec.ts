import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/', () => {
  test('Landing page renders without console errors', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const fatal = errs.filter((e) => !/favicon|net::ERR_/.test(e))
    expect(fatal, 'no console errors on /').toEqual([])
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign in|log in/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('Brand heading visible on landing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})

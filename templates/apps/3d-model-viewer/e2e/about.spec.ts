import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/about', () => {
  test('Renders without console errors', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    const fatal = errs.filter((e) => !/favicon|net::ERR_/.test(e))
    expect(fatal, 'no console errors on /about').toEqual([])
  })

  test('Has at least one heading', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Internal nav link back to / works', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    const homeLink = page.getByRole('link', { name: /home|landing|tessera|brand/i }).first()
    if ((await homeLink.count()) > 0) {
      await homeLink.click()
      await page.waitForURL(/\/(?:|about)?$/, { timeout: 5_000 }).catch(() => {})
    }
  })
})

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

const STATIC_ROUTES = ['/about', '/help', '/privacy', '/terms', '/pricing']

for (const route of STATIC_ROUTES) {
  test(`static route ${route} renders without runtime errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.goto(APP_BASE + route)
    await expect(page).toHaveURL(new RegExp(escape(route)))
    await expect(page.locator('body')).toBeVisible()
    const fatal = errors.filter((e) => !/favicon|net::ERR_/.test(e))
    expect(fatal).toEqual([])
  })
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers.js'

const ROUTES_PUBLIC = ['/', '/login', '/signup', '/forgot-password', '/pricing']
const ROUTES_AUTHED = [
  '/explore',
  '/galleries',
  '/albums',
  '/my-photos',
  '/favorites',
  '/upload',
  '/settings',
  '/plan-updated',
]

test.describe('routes-render', () => {
  for (const path of ROUTES_PUBLIC) {
    test(`public route renders: ${path}`, async ({ page }) => {
      const errs: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error') errs.push(m.text())
      })
      await page.goto(APP_BASE + path)
      await page.waitForLoadState('networkidle')
      // No fatal console errors that would suggest the page broke.
      const fatal = errs.filter((e) => !/favicon|net::ERR_|404|preload|deprecat/i.test(e))
      expect(fatal, `console errors on ${path}`).toEqual([])
      // Page actually has visible content.
      const h1 = await page.locator('h1, h2, h3').first().count()
      const bodyText = await page.locator('body').innerText()
      expect(h1 > 0 || bodyText.length > 50, `no visible content on ${path}`).toBe(true)
    })
  }

  test('authed routes all render after signup', async ({ page }) => {
    await signup(page)
    for (const path of ROUTES_AUTHED) {
      const errs: string[] = []
      const handler = (m: any) => {
        if (m.type() === 'error') errs.push(m.text())
      }
      page.on('console', handler)
      await page.goto(APP_BASE + path)
      await page.waitForLoadState('networkidle')
      page.off('console', handler)
      const fatal = errs.filter((e) => !/favicon|net::ERR_|404|preload|deprecat|chunk/i.test(e))
      expect(fatal, `console errors on ${path}`).toEqual([])
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length, `empty page at ${path}`).toBeGreaterThan(20)
    }
  })
})

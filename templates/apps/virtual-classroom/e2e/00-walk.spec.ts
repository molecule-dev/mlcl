/**
 * Walk every route, snapshotting console errors, network failures, and
 * dead handlers. Acts as the agent's eyes — runs as a normal Playwright
 * test so it benefits from the polite shared-browser sandboxing.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers.js'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/pricing']

const AUTH_ROUTES = [
  '/dashboard',
  '/courses',
  '/courses/00000000-0000-0000-0000-000000000000',
  '/assignments',
  '/assignments/00000000-0000-0000-0000-000000000000',
  '/calendar',
  '/grades',
  '/notifications',
  '/profile/me',
  '/settings',
  '/plan-updated',
  '/class/demo-room-1',
  '/whiteboard/demo',
]

test.describe('walk every route', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`PUBLIC ${route} renders without console errors`, async ({ page }) => {
      const errs: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error') errs.push(m.text())
      })
      page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
      const failedReqs: string[] = []
      page.on('response', (r) => {
        if (r.status() >= 500) failedReqs.push(`${r.request().method()} ${r.url()} → ${r.status()}`)
      })
      const resp = await page.goto(APP_BASE + route, { waitUntil: 'networkidle' })
      expect(resp?.status(), `nav status for ${route}`).toBeLessThan(400)
      const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e))
      expect(fatal, `console errors on ${route}`).toEqual([])
      expect(failedReqs, `5xx requests on ${route}`).toEqual([])
    })
  }

  test('AUTH routes all render without console errors', async ({ page }) => {
    await signup(page)
    const aggregateErrs: { route: string; errs: string[]; failed: string[] }[] = []
    for (const route of AUTH_ROUTES) {
      const errs: string[] = []
      const failedReqs: string[] = []
      const onConsole = (m: any) => {
        if (m.type() === 'error') errs.push(m.text())
      }
      const onPageError = (e: any) => errs.push(`pageerror: ${e.message}`)
      const onResp = (r: any) => {
        if (r.status() >= 500) failedReqs.push(`${r.request().method()} ${r.url()} → ${r.status()}`)
      }
      page.on('console', onConsole)
      page.on('pageerror', onPageError)
      page.on('response', onResp)
      try {
        await page.goto(APP_BASE + route, { waitUntil: 'networkidle' })
      } catch (e) {
        errs.push('navigation failed: ' + (e as Error).message)
      } finally {
        page.off('console', onConsole)
        page.off('pageerror', onPageError)
        page.off('response', onResp)
      }
      const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e))
      if (fatal.length || failedReqs.length) {
        aggregateErrs.push({ route, errs: fatal, failed: failedReqs })
      }
    }
    expect(aggregateErrs, 'auth route errors').toEqual([])
  })
})

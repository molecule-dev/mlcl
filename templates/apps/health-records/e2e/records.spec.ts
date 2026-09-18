/**
 * Records timeline + drill-through. Asserts that /records lists the
 * seeded items and that clicking a row deep-links to /records/:id which
 * fetches the matching resource.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('records', () => {
  test('renders timeline items from /api/records', async ({ page }) => {
    await signup(page, uniqueEmail('records-list'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/records')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-records"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/records/.test(r.url) && r.method === 'GET')).toBe(true)
    const links = page.locator('a[href^="/records/"]')
    await expect(links.first()).toBeAttached()
  })

  test('drilling through to a record detail loads /api/<resource>/:id', async ({ page }) => {
    await signup(page, uniqueEmail('records-drill'))
    await page.goto(APP_BASE + '/records')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href^="/records/"]').first()
    const href = await link.getAttribute('href')
    expect(href).toBeTruthy()
    // /records/visit:UUID → /api/visits/UUID. Map every record-list type
    // prefix to the resource path the detail page actually fetches.
    const m = /^\/records\/([^:]+):(.+)$/.exec(href!)
    expect(m, `record list link must use the type:UUID id format, got ${href}`).toBeTruthy()
    const TYPE_TO_PATH: Record<string, string> = {
      condition: 'conditions',
      allergy: 'allergies',
      visit: 'visits',
      lab: 'labs',
      medication: 'medications',
      procedure: 'visits',
    }
    const apiPath = TYPE_TO_PATH[m![1]] ?? m![1] + 's'
    const expectedUrl = new RegExp(`/api/${apiPath}/${m![2]}(?:[?#]|$)`)
    // waitForResponse races with the click — the SPA navigation triggers the
    // API call asynchronously, so we have to attach the waiter BEFORE the
    // click and await both in parallel.
    const [resp] = await Promise.all([
      page.waitForResponse((r) => expectedUrl.test(r.url()) && r.request().method() === 'GET', {
        timeout: 15_000,
      }),
      link.click(),
    ])
    expect(resp.status()).toBeLessThan(400)
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, '\\/')))
    await expect(page.locator('[data-mol-id="page-record-detail"]').first()).toBeVisible()
  })
})

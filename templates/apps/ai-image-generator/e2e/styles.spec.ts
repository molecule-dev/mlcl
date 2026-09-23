import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getStyles, signup } from './_helpers.js'

test.describe('/styles', () => {
  test('renders Style library h1 and fetches presets', async ({ page }) => {
    await signup(page)
    // The page's data fetch fires from a mount effect — after the top-bar h1
    // is already visible — so the capture must stay attached until the network
    // settles (networkidle), not just until the heading renders.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/styles')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/styles/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('renders a preset card for every style /api/styles returns', async ({ page }) => {
    await signup(page)
    // The library renders whatever presets the user has — read them from the
    // same endpoint rather than naming the ones the starter content ships with.
    const styles = await getStyles(page)
    await page.goto(APP_BASE + '/styles')
    for (const style of styles) {
      await expect(page.getByRole('heading', { name: style.name, level: 3 })).toBeVisible({
        timeout: 10000,
      })
    }
  })

  test('clicking a preset card POSTs /api/styles/:id/activate', async ({ page }) => {
    await signup(page)
    const styles = await getStyles(page)
    await page.goto(APP_BASE + '/styles')
    const reqs = await captureNetwork(page, async () => {
      // The card is a <button> wrapping the preset's h3 — click the heading.
      await page.getByRole('heading', { name: styles[0].name, level: 3 }).click()
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/styles\/[^/]+\/activate/.test(r.url) &&
          r.method === 'POST' &&
          r.status >= 200 &&
          r.status < 300,
      ),
    ).toBeTruthy()
  })

  test('clicking a second preset card POSTs /api/styles/:id/activate', async ({ page }) => {
    await signup(page)
    const styles = await getStyles(page)
    const other = styles[1] ?? styles[0]
    await page.goto(APP_BASE + '/styles')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('heading', { name: other.name, level: 3 }).click()
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/styles\/[^/]+\/activate/.test(r.url) &&
          r.method === 'POST' &&
          r.status >= 200 &&
          r.status < 300,
      ),
    ).toBeTruthy()
  })
})

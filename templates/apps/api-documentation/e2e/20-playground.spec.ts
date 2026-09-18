import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /playground — fetches /api/try-it for history on mount, sends real
// HTTP requests via POST /api/try-it, and shows the response panel.

test.describe('/playground', () => {
  test('heading + GET /api/try-it on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/playground')
      await page.getByRole('heading', { name: /API playground/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/try-it(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/try-it should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('Request URL field is editable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/playground')
    // The playground sends a REAL request through safeFetch. This used
    // httpbin.org, which is unreachable from a locked-down network — the send
    // never returned and the response panel never rendered. The app's own
    // /health is a real upstream with no internet dependency; safeFetch's SSRF
    // guard refuses loopback by design, so the harness allowlists exactly
    // 127.0.0.1:<API_PORT> (spin-up-app.sh). Shipped templates leave it unset.
    const url = page.getByRole('textbox', { name: /request url/i })
    await url.fill(`http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`)
    await expect(url).toHaveValue(`http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`)
  })

  test('Send fires POST /api/try-it and renders response panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/playground')
    await page.getByRole('heading', { name: /API playground/i }).waitFor({ timeout: 15_000 })
    await page
      .getByRole('textbox', { name: /request url/i })
      .fill(`http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^send$/i }).click()
      await page
        .locator('pre')
        // The upstream's real body. This matched httpbin's {args,headers} echo
        // before the target moved off the public internet; /health answers
        // {status,timestamp}. Still proves the response panel renders what the
        // upstream actually returned, not a stub.
        .filter({ hasText: /status|timestamp/i })
        .first()
        .waitFor({ timeout: 30_000 })
    })
    const call = reqs.find((r) => /\/api\/try-it(\?|$)/.test(r.url) && r.method === 'POST')
    expect(call, 'POST /api/try-it should fire on Send').toBeTruthy()
    expect(call!.status).toBe(200)
    // Response status pill (200/4xx/5xx) appears in the response section.
    await expect(page.getByRole('heading', { name: /^Response$/i })).toBeVisible({ timeout: 5_000 })
  })
})

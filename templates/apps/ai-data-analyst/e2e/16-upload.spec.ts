import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /upload — client-side parses a CSV/JSON file and POSTs the
// structured payload to /api/datasets/from_upload, then navigates to
// the new dataset's detail page.

test.describe('/upload', () => {
  test('renders the drop zone', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await expect(page.locator('input[type="file"]')).toBeAttached()
  })

  test('uploading a CSV POSTs /api/datasets/from_upload and navigates to the detail page', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    const fileInput = page.locator('input[type="file"]')
    const csv = 'id,name,amount\n1,alice,100\n2,bob,200\n3,carol,300\n'
    await fileInput.setInputFiles({
      name: 'walkthrough.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })
    // Wait for the submit button to appear after the file is selected
    const submitBtn = page.locator('[data-mol-id="upload-submit"]')
    await expect(submitBtn).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/datasets\/from_upload/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await submitBtn.click()
      await respPromise
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/datasets\/from_upload/.test(r.url))
    expect(post).toBeDefined()
    expect(post!.status).toBe(201)
    await expect(page).toHaveURL(/\/datasets\/[a-f0-9-]{8,}/, { timeout: 10_000 })
  })

  test('main upload region renders heading text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/upload')
    await expect(page.locator('main')).toContainText(/upload|drop|dataset/i)
  })

  // Note: the uploads handler (POST /api/uploads, GET /api/uploads,
  // PUT /api/uploads/:id) is the legacy direct-S3 path. The current
  // client-parse upload bypasses it and posts to /api/datasets/from_upload
  // instead, so /api/uploads is reserved for future binary-file modes.
  test('legacy GET /api/uploads endpoint is reachable with a bearer token', async ({ page }) => {
    await signup(page)
    const token = (await getAccessToken(page)) ?? ''
    expect(token, 'signup persisted an access token').toBeTruthy()
    const res = await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4040') + '/api/uploads',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    // 200 (empty list) or 204 — anything < 400 is acceptable. 404 means
    // the legacy uploads route was dropped without updating this assertion.
    expect(res.status(), 'GET /api/uploads should not 4xx/5xx').toBeLessThan(400)
  })
})

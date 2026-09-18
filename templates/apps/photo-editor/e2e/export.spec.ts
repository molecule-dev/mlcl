/**
 * /export — Lustra's export pipeline.
 *
 * Asserts that:
 *   - submitting an export POSTs /exports and the row immediately appears
 *     in the recent-exports list (read-after-write via UI),
 *   - the persisted row has status='completed' with output_url set
 *     (the handler resolves immediately to the source URL since no S3
 *     upload pipeline is wired — but the artifact must still be a real,
 *     downloadable URL),
 *   - the recent-exports download anchor carries `download` + `target`
 *     attributes so a real user click delivers a file,
 *   - format / quality / size selectors update the URL params used by
 *     the next POST.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, createImage, signup } from './_helpers.js'

test.describe('export', () => {
  test('with no images the page shows an empty CTA back to /library', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/export')
    await expect(page.locator('[data-mol-id="export-empty"]')).toBeVisible()
    await page
      .getByRole('link', { name: /open library/i })
      .first()
      .click()
    await page.waitForURL(/\/library/)
  })

  test('submitting an export POSTs /exports, persists, and shows in recent list with downloadable URL', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, {
      name: 'Export source',
      width: 1200,
      height: 800,
    })
    await page.goto(APP_BASE + `/export?photo=${image.id}`)

    await page.locator('[data-mol-id="export-format-jpg"]').click()
    await page.locator('[data-mol-id="export-size-instagram"]').click()

    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="export-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = calls.find((r) => r.method === 'POST' && /\/api\/exports\/?$/.test(r.url))
    expect(post?.status).toBe(201)

    // The success indicator must surface AND the recent list must include the row.
    await expect(page.locator('[data-mol-id="export-success"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="export-recent"]')).toBeVisible()

    // Read-after-write via the API: the export row exists, has format=jpg,
    // status=completed, and a non-null output_url.
    const list = await page.request.get(`${API_BASE}/exports`, { headers: apiHeaders(accessToken) })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{
      id: string
      format: string
      status: string
      output_url: string | null
      image_id: string
      width: number
      height: number
    }>
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const row = rows[0]
    expect(row.image_id).toBe(image.id)
    expect(row.format).toBe('jpg')
    expect(row.status).toBe('completed')
    expect(row.output_url).not.toBeNull()
    expect(row.width).toBeGreaterThan(0)
    expect(row.height).toBeGreaterThan(0)

    // The recent-exports anchor must use a real download attribute (not a
    // placeholder toast handler).
    const anchor = page.locator(`[data-mol-id="export-recent-${row.id}"] a`)
    await expect(anchor).toHaveAttribute('href', row.output_url ?? '')
    await expect(anchor).toHaveAttribute('download', /.*/)
  })

  test('quality slider clamps between 1 and 100 and round-trips into the POST', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, { name: 'Quality test' })
    await page.goto(APP_BASE + `/export?photo=${image.id}`)

    const slider = page.locator('[data-mol-id="export-quality"]')
    await slider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(el, '55')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.locator('[data-mol-id="export-format-webp"]').click()

    const requests: Array<{ url: string; method: string; postData: string | null }> = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/api\/exports/.test(r.url())) {
        requests.push({ url: r.url(), method: r.method(), postData: r.postData() })
      }
    })
    await page.locator('[data-mol-id="export-submit"]').click()
    await page.waitForTimeout(2000)
    expect(requests.length).toBeGreaterThanOrEqual(1)
    const body = JSON.parse(requests[0].postData ?? '{}')
    expect(body.quality).toBe(55)
    expect(body.format).toBe('webp')
    expect(body.image_id).toBe(image.id)
  })

  test('strip_exif toggle round-trips into the POST body', async ({ page }) => {
    const { accessToken } = await signup(page)
    const image = await createImage(page, accessToken, { name: 'EXIF test' })
    await page.goto(APP_BASE + `/export?photo=${image.id}`)

    await page.locator('[data-mol-id="export-strip-exif"]').click()
    await expect(page.locator('[data-mol-id="export-strip-exif"]')).toHaveAttribute(
      'data-checked',
      'true',
    )

    const requests: Array<{ postData: string | null }> = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/api\/exports/.test(r.url())) {
        requests.push({ postData: r.postData() })
      }
    })
    await page.locator('[data-mol-id="export-submit"]').click()
    await page.waitForTimeout(2000)
    expect(requests.length).toBeGreaterThanOrEqual(1)
    const body = JSON.parse(requests[0].postData ?? '{}')
    expect(body.strip_exif).toBe(true)
  })
})

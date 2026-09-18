/**
 * /image-generator — DALL-E-backed prompt-to-image surface.
 *
 * Real outcome: POST /api/images/generate returns a real image URL (DALL-E
 * "oaidalleapiprodscus" host or our /api/images/ proxy) and the rendered
 * <img> has a real, non-zero natural width.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/image-generator', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/image-generator')
  })

  test('h1 reads "AI Image Generator"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /AI Image Generator/i, level: 1 })).toBeVisible()
  })

  test('prompt textarea accepts text', async ({ page }) => {
    const ta = page.getByRole('textbox')
    await ta.fill('A serene mountain landscape at dusk')
    await expect(ta).toHaveValue('A serene mountain landscape at dusk')
  })

  test('Generate Image fires POST /api/images/generate and renders a real DALL-E image', async ({
    page,
  }) => {
    test.setTimeout(180_000) // DALL-E can be slow
    const prompt = 'A pen and a notebook on a wooden desk, soft morning light, photorealistic'
    await page.getByRole('textbox').fill(prompt)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Generate Image/i }).click()
      // Accept any of: legacy DALL-E hosted URL, internal proxy, plain
      // http(s) URL, or a data: URL (gpt-image-1 returns base64 — OpenAI
      // removed dall-e-3 and the new model has no URL form).
      await page.waitForSelector(
        'img[src*="oaidalleapiprodscus"], img[src*="/api/images/"], img[src^="http"], img[src^="data:image"]',
        { timeout: 150_000 },
      )
    })
    const post = reqs.find((r) => /\/api\/images\/generate$/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'images/generate POST must succeed').toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(300)
    const dims = await page
      .locator('img[src^="http"], img[src^="data:image"]')
      .first()
      .evaluate((el: any) => ({ w: el.naturalWidth, h: el.naturalHeight }))
    expect(dims.w, 'image must be a real render, not a 1x1 placeholder').toBeGreaterThan(256)
    expect(dims.h).toBeGreaterThan(256)
  })
})

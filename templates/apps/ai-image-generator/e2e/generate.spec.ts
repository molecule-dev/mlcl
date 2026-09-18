import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/generate', () => {
  test('renders Studio h1', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    await expect(page.getByRole('heading', { name: /Studio/i, level: 1 })).toBeVisible()
  })

  test('prompt textbox accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const tb = page.getByPlaceholder(/dreamscape/i)
    await tb.fill('a sleepy red panda')
    await expect(tb).toHaveValue('a sleepy red panda')
  })

  test('Photoreal style chip toggles pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    // Photoreal preselected; click another then back
    await page.getByRole('button', { name: /^Anime$/i }).click()
    const btn = page.getByRole('button', { name: /^Photoreal$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Anime style chip toggles pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const btn = page.getByRole('button', { name: /^Anime$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Generate" produces a real image artifact', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    await page.getByPlaceholder(/dreamscape/i).fill('Cute kitten')

    const generationsPost = page.waitForResponse(
      (r) => /\/api\/generations(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 90_000 },
    )

    // Mirror the real backend traffic through captureNetwork so the coverage
    // gate's "spec must call captureNetwork()" check is satisfied with a real
    // assertion (not just a token reference).
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^auto_awesome Generate$|^Generate$/i })
        .first()
        .click()
      const resp = await generationsPost
      const body = (await resp.json()) as {
        id?: string
        image_url?: string | null
        status?: string
      }
      expect(resp.status(), 'POST /api/generations must succeed').toBeLessThan(300)
      expect(body.id, 'response must include row id').toBeTruthy()
      expect(body.image_url, 'response must include a non-null image_url').toBeTruthy()
      expect(body.status, 'persisted status must be succeeded').toBe('succeeded')

      // Reload the detail page and verify the new image is rendered.
      await page.goto(APP_BASE + `/images/${body.id}`)
      const img = page.locator('main img').first()
      await expect(img, 'rendered <img> must point at the produced artifact').toHaveAttribute(
        'src',
        body.image_url!,
        { timeout: 10_000 },
      )
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/generations(?:\?|$)/.test(r.url) &&
          r.method === 'POST' &&
          r.status >= 200 &&
          r.status < 300,
      ),
      'POST /api/generations must show up in the captured network log',
    ).toBeTruthy()
  })

  test('1:1 Square aspect ratio button toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const btn = page.getByRole('button', { name: /1:1 Square/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('16:9 Wide aspect ratio button toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    // 16:9 is preselected; click 1:1 then 16:9 to confirm toggle
    await page.getByRole('button', { name: /1:1 Square/i }).click()
    const btn = page.getByRole('button', { name: /16:9 Wide/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Model combobox switches between options', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const combo = page.getByRole('combobox').first()
    await combo.selectOption({ label: 'Reverie Flash' })
    await expect(combo).toHaveValue(/.+/)
  })

  test('Steps slider has a value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    // The Steps control is a native <input type="range">; its current value is
    // exposed via the input's `value` (inputValue), not an explicit
    // aria-valuenow attribute.
    const slider = page.getByRole('slider').first()
    const v = await slider.inputValue()
    expect(Number(v)).toBeGreaterThan(0)
  })

  test('Seed spinbutton accepts a value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const sb = page.getByRole('spinbutton').first()
    await sb.fill('42424')
    await expect(sb).toHaveValue('42424')
  })

  test('"Randomize seed" changes the seed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const sb = page.getByRole('spinbutton').first()
    const before = await sb.inputValue()
    await page.getByRole('button', { name: /Randomize seed/i }).click()
    await page.waitForTimeout(200)
    const after = await sb.inputValue()
    expect(after).not.toBe(before)
  })

  test('"Lock seed" toggles its pressed state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    const btn = page.getByRole('button', { name: /Lock seed/i })
    const before = await btn.getAttribute('aria-pressed')
    await btn.click()
    const after = await btn.getAttribute('aria-pressed')
    expect(after).not.toBe(before)
  })

  test('clicking a variant card navigates to /images/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/generate')
    // a freshly-signed-up user is bootstrapped with seed generations rendered as variant links
    const link = page.locator('a[href^="/images/"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(/\/images\//)
  })
})

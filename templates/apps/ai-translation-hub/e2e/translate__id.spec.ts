import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedProject,
  seedSegment,
  signup,
} from './_helpers.js'

test.describe('/translate/:id: editor read-after-write', () => {
  test('typing a translation persists to the segment via PUT', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken)
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Persisted translation source.',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/translate/${project.id}`)
      const editor = page.locator(`textarea[data-mol-id="segment-target-${seg.id}"]`).first()
      await expect(editor).toBeVisible({ timeout: 10_000 })
      await editor.fill('Translated text.')
      await editor.blur()
      await page.waitForResponse(
        (r) =>
          /\/api\/segments\//.test(r.url()) && r.request().method() === 'PUT' && r.status() < 300,
        { timeout: 10_000 },
      )
    })
    expect(reqs.find((r) => /\/api\/segments\//.test(r.url) && r.method === 'PUT')).toBeDefined()

    const verify = await page.request.get(`${API_BASE}/segments/${seg.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(verify.status()).toBeLessThan(300)
    const body = (await verify.json()) as { props?: { target_text?: string }; target_text?: string }
    const got = body.props ?? body
    expect(got.target_text).toBe('Translated text.')
  })

  test('POST /api/translations/translate fires when the user clicks Machine translate', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken)
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Hola mundo.',
      source_lang: 'ES',
      target_lang: 'EN',
    })
    await page.goto(`${APP_BASE}/translate/${project.id}`)
    const editor = page.locator(`textarea[data-mol-id="segment-target-${seg.id}"]`).first()
    await expect(editor).toBeVisible({ timeout: 15_000 })
    await editor.click()
    const reqs = await captureNetwork(page, async () => {
      const mt = page.getByRole('button', { name: /machine\s+translate/i }).first()
      await expect(mt).toBeVisible({ timeout: 5_000 })
      await mt.click()
      await page.waitForResponse((r) => /\/api\/translations\/translate/.test(r.url()), {
        timeout: 30_000,
      })
    })
    const mtCall = reqs.find(
      (r) => /\/api\/translations\/translate/.test(r.url) && r.method === 'POST',
    )
    expect(mtCall, 'translations/translate POST should fire').toBeDefined()
    expect(mtCall!.status, `POST /translations/translate failed: ${mtCall?.status}`).toBeLessThan(
      300,
    )
  })

  test('the editor surfaces the seeded segment source text on the page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken)
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Editor visible source.',
    })
    await page.goto(`${APP_BASE}/translate/${project.id}`)
    await expect(page.getByText('Editor visible source.').first()).toBeVisible({ timeout: 10_000 })
    expect(seg.id).toBeTruthy()
  })

  test('reload of /translate/:id rehydrates the latest target_text from the backend', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken)
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Round-trip source.',
    })
    await page.request.put(`${API_BASE}/segments/${seg.id}`, {
      headers: apiHeaders(accessToken),
      data: { target_text: 'Cached round-trip target.' },
    })
    await page.goto(`${APP_BASE}/translate/${project.id}`)
    const editor = page.locator(`textarea[data-mol-id="segment-target-${seg.id}"]`).first()
    await expect(editor).toHaveValue('Cached round-trip target.', { timeout: 10_000 })
  })
})

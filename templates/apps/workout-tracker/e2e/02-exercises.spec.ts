import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, API_BASE, captureNetwork, getExercises } from './_helpers.js'

test.describe('/exercises', () => {
  test('library lists the exercises the catalog endpoint serves', async ({ page }) => {
    await signup(page)
    // The names to look for come from the same endpoint the page reads.
    const catalog = await getExercises(page)
    const names = catalog.slice(0, 3).map((ex) => ex.name)
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/exercises')
      await page.waitForLoadState('networkidle').catch(() => null)
      for (const name of names) {
        await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
      }
    })
    const list = reqs.find((r) => /\/api\/exercises(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/exercises was not observed').toBeTruthy()
    expect(list!.status).toBe(200)
  })

  test('creating a custom exercise persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto('/exercises')
    await page.waitForLoadState('networkidle').catch(() => null)

    const newExerciseButton = page
      .getByRole('button', { name: /new exercise|add exercise|create/i })
      .first()
    await newExerciseButton.click()

    const unique = `Custom Lift ${Date.now()}`
    const nameInput = page
      .getByRole('textbox', { name: /name|exercise/i })
      .or(page.locator('input[type="text"]').first())
      .first()
    await nameInput.fill(unique)
    const submit = page.getByRole('button', { name: /create|save|add/i }).last()
    await submit.click()

    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 15000 })

    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 15000 })
  })

  test('GET /exercises returns a populated catalog for an authed user', async ({
    page,
    request,
  }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const resp = await request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    expect(resp.status(), `GET /exercises ${await resp.text().catch(() => '')}`).toBe(200)
    const body = await resp.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    // Every row is usable by the composer: an id to select and a name to show.
    for (const ex of body as { id?: string; name?: string }[]) {
      expect(ex.id).toBeTruthy()
      expect(ex.name).toBeTruthy()
    }
  })
})

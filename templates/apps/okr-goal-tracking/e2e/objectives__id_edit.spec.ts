import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedKeyResult,
  seedObjective,
  signup,
} from './_helpers.js'

test.describe('Edit objective /objectives/:id/edit', () => {
  test('renders existing objective fields prefilled', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, {
      title: 'Edit-prefill',
      description: 'Existing description',
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await expect(page.locator('form input[type="text"]').first()).toHaveValue('Edit-prefill')
    await expect(page.locator('form textarea').first()).toHaveValue('Existing description')
  })

  test('save changes PATCHes the objective and persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-save-original' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page.locator('form input[type="text"]').first().fill('Edit-save-updated')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save changes/i }).click()
      await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    })
    const patched = reqs.find(
      (r) => r.method === 'PATCH' && new RegExp(`/api/objectives/${obj.id}`).test(r.url),
    )
    expect(patched).toBeTruthy()
    expect(patched!.status).toBeLessThan(300)

    // Read-after-write via API.
    const fresh = await page.request.get(`${API_BASE}/objectives/${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    expect(fresh.status()).toBe(200)
    const body = (await fresh.json()) as { title: string }
    expect(body.title).toBe('Edit-save-updated')
  })

  test('Add KR appends a fresh KR row that gets saved when Save changes is clicked', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-add-kr' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page.getByRole('button', { name: /add kr/i }).click()
    await page.waitForTimeout(200)
    // Newly added KR title is the first text input AFTER the objective title.
    const krInputs = page.locator('form input[type="text"]')
    const lastIdx = (await krInputs.count()) - 1
    await krInputs.nth(lastIdx).fill('Edit-newly-added KR')
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    const list = await page.request.get(`${API_BASE}/key-results?objective_id=${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const krs = (await list.json()) as Array<{ title: string }>
    expect(krs.find((k) => k.title === 'Edit-newly-added KR')).toBeDefined()
  })

  test('Editing an existing KR PATCHes /api/key-results/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-existing-kr' })
    const kr = await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'Original KR',
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    // The KR title input is the second text input (first is the objective title).
    const krInputs = page.locator('form input[type="text"]')
    await krInputs.nth(1).fill('Renamed KR')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save changes/i }).click()
      await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    })
    const patched = reqs.find(
      (r) => r.method === 'PATCH' && new RegExp(`/api/key-results/${kr.id}`).test(r.url),
    )
    expect(patched).toBeTruthy()
    const fresh = await page.request.get(`${API_BASE}/key-results?objective_id=${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const krs = (await fresh.json()) as Array<{ id: string; title: string }>
    expect(krs.find((k) => k.id === kr.id)?.title).toBe('Renamed KR')
  })

  test('Archive objective removes it from the active list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-archive' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /archive objective/i }).click()
    await page.waitForURL(/\/objectives$/, { timeout: 15000 })
    // Active list (default = archived=false) must not include the archived row.
    const list = await page.request.get(`${API_BASE}/objectives?archived=false`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await list.json()) as Array<{ id: string }>
    expect(body.find((o) => o.id === obj.id)).toBeUndefined()
  })

  test('Cancel link returns to detail without saving', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-cancel' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page.locator('form input[type="text"]').first().fill('Should-not-persist-after-cancel')
    await page.getByRole('link', { name: 'Cancel', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/objectives/${obj.id}$`))
    const fresh = await page.request.get(`${API_BASE}/objectives/${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { title: string }
    expect(body.title).toBe('Edit-cancel')
  })

  test('Breadcrumb Objectives routes back to /objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-crumb' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page
      .getByRole('link', { name: /^objectives$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/objectives$/)
  })

  test('Breadcrumb objective title routes to detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-crumbtitle' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page
      .getByRole('link', { name: /edit-crumbtitle/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/objectives/${obj.id}$`))
  })

  test('Heading copy "Update the outcome…" visible', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-heading' })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await expect(page.getByRole('heading', { name: /update the outcome/i })).toBeVisible()
  })

  test('Description textarea persists user edits via PATCH', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, {
      title: 'Edit-desc',
      description: 'old',
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page.locator('form textarea').first().fill('Refined description with more detail.')
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    const fresh = await page.request.get(`${API_BASE}/objectives/${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const body = (await fresh.json()) as { description: string }
    expect(body.description).toContain('Refined description with more detail.')
  })

  test('Remove KR drops a key-result row before save (no API call until Save)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-remove-kr' })
    const kr = await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'Doomed KR',
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    await page
      .getByRole('button', { name: /^remove$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    // Confirm the doomed KR's title input is gone from the form.
    const inputs = page.locator('form input[type="text"]')
    const allValues = await inputs.evaluateAll((els) =>
      (els as HTMLInputElement[]).map((el) => el.value),
    )
    expect(allValues.includes('Doomed KR')).toBe(false)
    // Save and verify the KR was deleted.
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    const list = await page.request.get(`${API_BASE}/key-results?objective_id=${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const krs = (await list.json()) as Array<{ id: string }>
    expect(krs.find((k) => k.id === kr.id)).toBeUndefined()
  })

  test('KR start/current/target numeric inputs accept and persist values', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-kr-numbers' })
    const kr = await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'Numeric KR',
      metric_type: 'number',
      start_value: 0,
      target_value: 100,
      current_value: 0,
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    // The numeric KR fields use placeholder hints "Start", "Current", "Target".
    await page.locator('input[placeholder*="Start"]').first().fill('10')
    await page.locator('input[placeholder*="Current"]').first().fill('50')
    await page.locator('input[placeholder*="Target"]').first().fill('200')
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    const fresh = await page.request.get(`${API_BASE}/key-results?objective_id=${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const krs = (await fresh.json()) as Array<{
      id: string
      start_value: number | string
      current_value: number | string
      target_value: number | string
    }>
    const updated = krs.find((k) => k.id === kr.id)!
    expect(Number(updated.start_value)).toBe(10)
    expect(Number(updated.current_value)).toBe(50)
    expect(Number(updated.target_value)).toBe(200)
  })

  test('KR metric_type select changes the persisted metric', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-kr-metric' })
    const kr = await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'Metric-flip KR',
      metric_type: 'number',
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}/edit`)
    // Choose "% percentage" → backend should store metric_type='percent'.
    await page.locator('form select').first().selectOption({ label: '% percentage' })
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForURL(new RegExp(`/objectives/${obj.id}$`), { timeout: 15000 })
    const fresh = await page.request.get(`${API_BASE}/key-results?objective_id=${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const krs = (await fresh.json()) as Array<{ id: string; metric_type: string }>
    const updated = krs.find((k) => k.id === kr.id)
    expect(updated?.metric_type).toBe('percent')
  })
})

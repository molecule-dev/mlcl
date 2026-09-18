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

test.describe('Check-in /check-in', () => {
  test('empty state visible when no KRs exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/check-in')
    await expect(page.getByTestId('check-in-empty')).toBeVisible()
  })

  test('shows the seeded objective + KR for check-in', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'CI-shows' })
    await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'CI-KR',
      metric_type: 'number',
      start_value: 0,
      target_value: 100,
    })
    await page.goto(APP_BASE + '/check-in')
    await expect(page.locator('main')).toContainText('CI-shows')
    await expect(page.locator('main')).toContainText('CI-KR')
  })

  test('submitting a value updates KR current_value (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'CI-rw' })
    const kr = await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'CI-KR-rw',
      metric_type: 'number',
      start_value: 0,
      target_value: 100,
      current_value: 0,
    })
    await page.goto(APP_BASE + '/check-in')
    await page.getByTestId(`kr-value-${kr.id}`).fill('42')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /submit check-in/i }).click()
      await expect(page.getByTestId('check-in-success')).toBeVisible({ timeout: 10000 })
    })
    const ci = reqs.find((r) => r.method === 'POST' && /\/api\/check-ins/.test(r.url))
    expect(ci, 'POST /api/check-ins not observed').toBeTruthy()
    expect(ci!.status).toBeLessThan(300)
    const fresh = await page.request.get(`${API_BASE}/key-results?objective_id=${obj.id}`, {
      headers: apiHeaders(accessToken!),
    })
    const krs = (await fresh.json()) as Array<{ id: string; current_value: number | string }>
    const updated = krs.find((k) => k.id === kr.id)!
    expect(Number(updated.current_value)).toBe(42)
  })

  test('changing confidence updates aria-pressed on the chosen pill', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'CI-conf' })
    await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'CI-KR-conf',
      metric_type: 'number',
      start_value: 0,
      target_value: 100,
    })
    await page.goto(APP_BASE + '/check-in')
    const atRiskBtn = page.getByRole('button', { name: /at risk/i }).first()
    await atRiskBtn.click()
    await expect(atRiskBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Open → link goes to objective detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'CI-open' })
    await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'CI-open-KR',
    })
    await page.goto(APP_BASE + '/check-in')
    await page
      .getByRole('link', { name: /open →/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/objectives/${obj.id}$`))
  })

  test('Notes textarea accepts text', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'CI-note' })
    await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'CI-note-KR',
    })
    await page.goto(APP_BASE + '/check-in')
    const note = page.locator('textarea').first()
    await note.fill('Bright spot: shipped wizard.')
    await expect(note).toHaveValue('Bright spot: shipped wizard.')
  })

  test('Page heading "Weekly check-in" visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/check-in')
    await expect(page.getByRole('heading', { name: /weekly check-in/i })).toBeVisible()
  })

  test('initial GET /api/objectives + /api/key-results fired on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/check-in')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const objs = reqs.find((r) => r.method === 'GET' && /\/api\/objectives(\?|$)/.test(r.url))
    const krs = reqs.find((r) => r.method === 'GET' && /\/api\/key-results(\?|$)/.test(r.url))
    expect(objs).toBeTruthy()
    expect(krs).toBeTruthy()
  })
})

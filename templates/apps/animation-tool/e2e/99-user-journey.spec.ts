import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('99-user-journey: full Vivace top-to-bottom flow', () => {
  test('signup → create project → add layer → insert keyframe via Library → add state → export → download', async ({
    page,
  }) => {
    // 1. SIGN UP
    const email = uniqueEmail('journey')
    await signup(page, email)
    expect(page.url(), 'lands on /dashboard after signup').toMatch(/\/dashboard/)

    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    // 2. CREATE PROJECT via UI (validates POST + redirect + invariant)
    await page.goto(APP_BASE + '/projects')
    await page
      .getByRole('button', { name: /New project/i })
      .first()
      .click()
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}/, { timeout: 15_000 })
    const projectId = page.url().match(/\/projects\/([0-9a-f-]{36})/)![1]

    const projects = await page.request.get(`${API_BASE}/projects`, {
      headers: { Cookie: cookieStr },
    })
    const projectsArr = await projects.json()
    expect(
      projectsArr.some((p: { id: string }) => p.id === projectId),
      'project persists in DB',
    ).toBe(true)

    // 3. ADD LAYER via UI
    await page.getByRole('button', { name: /Add layer/i }).click()
    await page.waitForTimeout(2_000)
    const layers = await page.request.get(`${API_BASE}/layers?projectId=${projectId}`, {
      headers: { Cookie: cookieStr },
    })
    const layersArr = await layers.json()
    expect(layersArr.length, 'layer persists in DB').toBeGreaterThan(0)

    // 4. INSERT KEYFRAME via Library page
    await page.goto(APP_BASE + '/library')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /^Insert$/ })
      .first()
      .click()
    await page.waitForTimeout(2_000)
    const keyframes = await page.request.get(`${API_BASE}/keyframes?projectId=${projectId}`, {
      headers: { Cookie: cookieStr },
    })
    const kfArr = await keyframes.json()
    expect(kfArr.length, 'keyframe persists in DB').toBeGreaterThan(0)

    // 5. ADD STATE via state-machine UI
    await page.goto(APP_BASE + `/projects/${projectId}/states`)
    await page.getByRole('button', { name: /Add state/i }).click()
    await page.waitForTimeout(2_000)
    const states = await page.request.get(`${API_BASE}/states?projectId=${projectId}`, {
      headers: { Cookie: cookieStr },
    })
    const statesArr = await states.json()
    expect(statesArr.length, 'state persists in DB').toBeGreaterThan(0)
    expect(statesArr[0].is_initial, 'first state must be initial').toBe(true)

    // 6. EXPORT and DOWNLOAD
    await page.goto(APP_BASE + `/projects/${projectId}/export`)
    await page.locator('[data-mol-id="export-start"]').click()
    await page.waitForFunction(
      async (id: string) => {
        try {
          const r = await fetch(`/api/exports?projectId=${id}`, { credentials: 'include' })
          const arr = await r.json()
          return (
            Array.isArray(arr) && arr.some((x: { status?: string }) => x.status === 'completed')
          )
        } catch {
          return false
        }
      },
      projectId,
      { timeout: 15_000 },
    )
    const exports = await page.request.get(`${API_BASE}/exports?projectId=${projectId}`, {
      headers: { Cookie: cookieStr },
    })
    const xArr = await exports.json()
    const completed = xArr.find((e: { status?: string }) => e.status === 'completed')
    expect(completed, 'completed export must exist').toBeTruthy()
    const dl = await page.request.get(
      `http://localhost:${process.env.API_PORT || '4050'}${completed.output_url}`,
      { headers: { Cookie: cookieStr } },
    )
    expect(dl.status()).toBe(200)
    const text = await dl.text()
    expect(text.length, 'download body must be a real artifact').toBeGreaterThan(50)
    const lottie = JSON.parse(text)
    expect(lottie.layers.length, 'lottie must include the layer we created').toBeGreaterThan(0)
  })

  test('reload after signup keeps session active', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    expect(page.url(), 'still authenticated after reload').toMatch(/\/dashboard/)
  })
})

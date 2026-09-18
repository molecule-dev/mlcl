import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createComponent, createIncident, signup } from './_helpers.js'

test.describe('/incidents/:id', () => {
  test('renders an incident, its initial timeline message and the post-update editor', async ({
    page,
  }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Detail-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Detail incident ${Date.now()}`,
      affected: [c.id],
      message: 'first contact',
    })
    await page.goto(APP_BASE + `/incidents/${inc.id}`)
    await expect(page.getByRole('heading', { name: /Detail incident/ })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByTestId('incident-timeline').getByText('first contact', { exact: false }),
    ).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('post-update-message')).toBeVisible()
  })

  test('GET /api/incidents/:id is issued on load', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Get-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Get target ${Date.now()}`,
      affected: [c.id],
      message: 'getting',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/incidents/${inc.id}`)
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.url.endsWith(`/incidents/${inc.id}`) && r.method === 'GET')
    expect(get?.status, 'GET /api/incidents/:id').toBe(200)
  })

  test('Save draft persists across reload', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Draft-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Draft target ${Date.now()}`,
      affected: [c.id],
    })
    await page.goto(APP_BASE + `/incidents/${inc.id}`)
    const draft = `keep ${Date.now()}`
    await page.getByTestId('post-update-message').fill(draft)
    await page.getByTestId('save-draft-btn').click()
    await page.reload()
    await expect(page.getByTestId('post-update-message')).toHaveValue(draft, { timeout: 10_000 })
  })

  test('Posting an update appends to the timeline', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Post-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Post target ${Date.now()}`,
      affected: [c.id],
      message: 'before',
    })
    await page.goto(APP_BASE + `/incidents/${inc.id}`)
    const newMsg = `progress ${Date.now()}`
    await page.getByTestId('post-status-monitoring').click()
    await page.getByTestId('post-update-message').fill(newMsg)
    await page.getByTestId('post-update-btn').click()
    await expect(page.getByText(newMsg)).toBeVisible({ timeout: 5_000 })
  })

  test('Back link returns to /incidents', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Back-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Back ${Date.now()}`,
      affected: [c.id],
    })
    await page.goto(APP_BASE + `/incidents/${inc.id}`)
    const back = page.getByRole('link', { name: /all incidents|back/i }).first()
    await back.click()
    await expect(page).toHaveURL(/\/incidents$/, { timeout: 10_000 })
  })
})

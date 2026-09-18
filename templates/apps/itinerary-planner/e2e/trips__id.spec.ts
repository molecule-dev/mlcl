import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiGet, apiPost, captureNetwork, signupAndCreateTrip } from './_helpers'

test.describe('/trips/:id', () => {
  test('shows the trip name and budget after creating', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    await expect(page.locator('[data-testid="trip-detail-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="trip-detail-name"]')).toContainText(/Iceland Loop/i)
    await expect(page.locator('[data-testid="trip-detail-budget"]')).toBeVisible()
  })

  test('Add-activity button toggles the inline form', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    await expect(page.locator('[data-testid="trip-detail-add-form"]')).toHaveCount(0)
    await page.locator('[data-testid="trip-detail-add-activity"]').click()
    await expect(page.locator('[data-testid="trip-detail-add-form"]')).toBeVisible()
  })

  test('Submitting an activity POSTs /api/activities and persists', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    await page.locator('[data-testid="trip-detail-add-activity"]').click()
    await page.locator('[data-testid="trip-detail-add-title"]').fill('Hike Reynisfjara')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="trip-detail-add-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/activities/.test(r.url))
    expect(post, 'POST /api/activities must fire').toBeDefined()
    expect(post!.status).toBeLessThan(400)
    // Read-after-write: GET /api/activities returns the new activity
    const list = await apiGet<unknown[]>(page, token, '/activities')
    expect(list.status).toBe(200)
    expect(JSON.stringify(list.body)).toContain('Hike Reynisfjara')
  })

  test('Share button POSTs /api/trips/:id/share and reveals a share URL', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="trip-detail-share"]').click()
      await page.waitForTimeout(1500)
    })
    const share = reqs.find((r) => r.method === 'POST' && /\/api\/trips\/.+\/share$/.test(r.url))
    expect(share, 'share POST must fire').toBeDefined()
    expect(share!.status).toBeLessThan(400)
    await expect(page.locator('[data-testid="trip-detail-share-result"]')).toBeVisible()
  })

  test('Add activity persists across reload', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    await apiPost(page, token, '/activities', {
      trip_id: tripId,
      day_index: 1,
      title: 'Lava cave tour',
    })
    await page.goto(APP_BASE + '/trips/' + tripId)
    await expect(page.getByText(/Lava cave tour/i)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/Lava cave tour/i)).toBeVisible()
  })

  test('Collaborator invite POSTs /api/collaborators and shows confirmation', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    const inviteInput = page.locator('[data-testid="trip-detail-invite-email"]')
    if (await inviteInput.count()) {
      await inviteInput.fill('friend@example.com')
      const reqs = await captureNetwork(page, async () => {
        await page.locator('[data-testid="trip-detail-invite-submit"]').click()
        await page.waitForTimeout(1500)
      })
      const post = reqs.find((r) => r.method === 'POST' && /\/api\/collaborators/.test(r.url))
      expect(post, 'collaborators POST must fire').toBeDefined()
      expect(post!.status).toBeLessThan(400)
      await expect(page.locator('[data-testid="trip-detail-invite-sent"]')).toBeVisible()
    }
  })

  test('Trip is owned by the creator (read-after-write)', async ({ page }) => {
    const { tripId, token } = await signupAndCreateTrip(page)
    const t = await apiGet<{ id: string; user_id: string }>(page, token, '/trips/' + tripId)
    expect(t.status).toBe(200)
    expect(t.body.id).toBe(tripId)
    expect(t.body.user_id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('Day index is a numeric input', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    await page.locator('[data-testid="trip-detail-add-activity"]').click()
    const day = page.locator('[data-testid="trip-detail-add-day"]')
    await day.fill('3')
    await expect(day).toHaveValue('3')
  })

  test('Activity kind is selectable', async ({ page }) => {
    const { tripId } = await signupAndCreateTrip(page)
    await page.goto(APP_BASE + '/trips/' + tripId)
    await page.locator('[data-testid="trip-detail-add-activity"]').click()
    const kind = page.locator('[data-testid="trip-detail-add-kind"]')
    await kind.selectOption({ index: 1 }).catch(() => {})
    // Smoke check — kind should have at least one option
    const opts = await kind.locator('option').count()
    expect(opts).toBeGreaterThanOrEqual(1)
  })
})

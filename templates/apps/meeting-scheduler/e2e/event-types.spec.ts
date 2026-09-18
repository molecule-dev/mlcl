import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueSlug, authedApi } from './_helpers.js'

test.describe('Event types — host CRUD', () => {
  test('list page shows empty state when none exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/event-types')
    await expect(page.getByRole('heading', { name: /event types/i })).toBeVisible()
    await expect(page.getByText(/no event types/i)).toBeVisible()
  })

  test('editor saves a new event type and persists across reload', async ({ page, request }) => {
    const session = await signup(page)
    const slug = uniqueSlug('discovery')
    await page.goto(APP_BASE + '/event-types/new')
    await page.getByTestId('event-type-name').fill('My Intro Chat')
    await page.getByTestId('event-type-slug').fill(slug)
    await page.getByTestId('duration-30').click()
    await page.getByTestId('save-event-type').click()
    await expect(page.getByTestId('event-type-editor-saved-at')).toBeVisible({ timeout: 10000 })

    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/event-types')
    expect(list.status()).toBe(200)
    const items = (await list.json()) as Array<{ slug: string; name: string }>
    const found = items.find((x) => x.slug === slug)
    expect(found, 'event type persists in DB').toBeDefined()
    expect(found!.name).toBe('My Intro Chat')

    await page.reload()
    await expect(page.locator(`input[data-testid="event-type-slug"]`)).toHaveValue(slug)
  })

  test('toggle active flips is_active on the backend', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const slug = uniqueSlug('toggle')
    const created = await api.post('/event-types', {
      name: 'Toggle test',
      slug,
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    expect(created.status()).toBeLessThan(400)
    const et = await created.json()

    await page.goto(APP_BASE + `/event-types/${et.id}`)
    await expect(page.getByTestId('toggle-active')).toBeVisible()
    await page.getByTestId('toggle-active').click()
    await page.waitForTimeout(800)
    const refreshed = await api.get(`/event-types/${et.id}`)
    expect(refreshed.status()).toBe(200)
    const next = await refreshed.json()
    expect(next.is_active).toBe(false)
  })

  test('delete removes an event type and routes back to /event-types', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const slug = uniqueSlug('del')
    const created = await api.post('/event-types', {
      name: 'Delete test',
      slug,
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await created.json()
    await page.goto(APP_BASE + `/event-types/${et.id}`)
    page.once('dialog', (d) => d.accept())
    await page.getByTestId('delete-event-type').click()
    await expect(page).toHaveURL(/\/event-types$/, { timeout: 10000 })

    const after = await api.get(`/event-types/${et.id}`)
    expect(after.status(), 'GET deleted event type returns 404').toBe(404)
  })

  test('duplicate slug is rejected with a 409', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const slug = uniqueSlug('dup')
    const ok = await api.post('/event-types', {
      name: 'First',
      slug,
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    expect(ok.status()).toBeLessThan(400)
    const dup = await api.post('/event-types', {
      name: 'Second',
      slug,
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    expect(dup.status(), 'duplicate slug must conflict').toBe(409)
  })
})

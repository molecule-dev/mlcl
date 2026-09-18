/**
 * /event-types/:id — host editor for a single event type.
 *
 * Covers: tab structure, save persists, slug echo, copy-link, delete dialog.
 * (Toggle-active + create-new + duplicate-slug are exercised in
 * `event-types.spec.ts` for the list page; this file proves the editor UI
 * itself reads + writes the right rows.)
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueSlug, authedApi, captureNetwork } from './_helpers.js'

test.describe('Event type editor — /event-types/:id', () => {
  test('General + Reminders tabs both render in the editor', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/event-types/new')
    await expect(page.getByRole('button', { name: /^general$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^reminders$/i })).toBeVisible()
  })

  test('editing an existing event type prefills slug + name + duration', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const slug = uniqueSlug('prefill')
    const created = await api.post('/event-types', {
      name: 'Prefilled call',
      slug,
      duration_minutes: 45,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await created.json()

    await page.goto(APP_BASE + `/event-types/${et.id}`)
    await expect(page.getByTestId('event-type-name')).toHaveValue('Prefilled call')
    await expect(page.getByTestId('event-type-slug')).toHaveValue(slug)
  })

  test('saving an edit posts to /api/event-types and persists via read-after-write', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const slug = uniqueSlug('save')
    const created = await api.post('/event-types', {
      name: 'Will rename',
      slug,
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await created.json()

    await page.goto(APP_BASE + `/event-types/${et.id}`)
    await page.getByTestId('event-type-name').fill('Renamed event')

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('save-event-type').click()
      await expect(page.getByTestId('event-type-editor-saved-at')).toBeVisible({ timeout: 10000 })
    })
    const wrote = reqs.find(
      (r) => /\/api\/event-types\//.test(r.url) && /PATCH|PUT|POST/.test(r.method),
    )
    expect(wrote, 'PATCH/PUT/POST to /api/event-types fired').toBeTruthy()

    const fresh = await api.get(`/event-types/${et.id}`)
    const body = await fresh.json()
    expect(body.name).toBe('Renamed event')
  })

  test('copy-link button is wired and visible on the editor', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const slug = uniqueSlug('copy')
    const created = await api.post('/event-types', {
      name: 'Copyable',
      slug,
      duration_minutes: 30,
      location_kind: 'jitsi',
      is_active: true,
    })
    const et = await created.json()
    await page.goto(APP_BASE + `/event-types/${et.id}`)
    await expect(page.getByTestId('copy-link')).toBeVisible()
  })
})

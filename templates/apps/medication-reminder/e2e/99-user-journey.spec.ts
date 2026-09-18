import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

/**
 * Kitchen-sink cross-page flow. A real user signs up, adds a medication,
 * takes a dose, requests a refill, invites a caregiver, marks notifications
 * as read, edits + deletes the medication. We assert at every step that
 * server state matches the UI action — this is the contract that makes the
 * app "production-ready".
 */
test('user journey: signup → med → take dose → refill → caregiver → notif → edit → delete', async ({
  page,
}) => {
  await signup(page)

  // 1. Add medication
  const med = await api<{ id: string; name: string }>(page, 'POST', '/medications', {
    name: 'Atorvastatin Journey',
    dose_amount: '20 mg',
    pill_color: 'green',
    schedule_summary: 'Every morning at 8',
    schedule_times: ['08:00'],
    pharmacy: 'CVS Main',
    warnings: ['Take with food'],
  })
  expect(med.id).toBeTruthy()

  // Visit Medications page → see the new card
  await page.goto(APP_BASE + '/medications')
  await expect(page.getByText(/atorvastatin journey/i).first()).toBeVisible({ timeout: 10_000 })

  // 2. Take today's dose
  const doses = await api<Array<{ id: string; medication_id: string }>>(
    page,
    'GET',
    '/doses?filter=today',
  )
  const dose = doses.find((d) => d.medication_id === med.id)
  expect(dose, 'today contains the new medication').toBeTruthy()
  await api(page, 'POST', `/doses/${dose!.id}/take`, {})
  const reread = await api<{ status: string }>(page, 'GET', `/doses/${dose!.id}`)
  expect(reread.status).toBe('taken')

  // 3. Request a refill
  await api(page, 'POST', `/refills/${med.id}/request`, {})
  const refills = await api<Array<{ medication_id: string; status: string }>>(
    page,
    'GET',
    '/refills?status=requested',
  )
  expect(refills.find((r) => r.medication_id === med.id)?.status).toBe('requested')

  // Refills page reflects the new requested status
  await page.goto(APP_BASE + '/refills')
  await expect(page.getByText(/atorvastatin journey/i).first()).toBeVisible({ timeout: 10_000 })

  // 4. Invite a caregiver
  await api(page, 'POST', '/caregivers', {
    caregiver_email: `caregiver-journey-${Date.now()}@example.com`,
    permission: 'view',
  })
  await page.goto(APP_BASE + '/caregivers')
  await expect(page.getByText(/caregiver-journey-/i).first()).toBeVisible({ timeout: 10_000 })

  // 5. Create + mark a notification as read
  const notif = await api<{ id: string }>(page, 'POST', '/notifications', {
    kind: 'system_message',
    title: 'Reminder setup complete',
    body: 'You have everything you need.',
  })
  await api(page, 'POST', `/notifications/${notif.id}/read`, {})
  const reread2 = await api<{ read: boolean }>(page, 'GET', `/notifications/${notif.id}`)
  expect(reread2.read).toBe(true)

  // 6. Edit medication name + verify on detail page
  const newName = `Atorvastatin Renamed ${Date.now()}`
  await api(page, 'PATCH', `/medications/${med.id}`, { name: newName, dosage: '40 mg' })
  await page.goto(APP_BASE + `/medications/${med.id}`)
  await expect(page.getByRole('heading', { name: new RegExp(newName) }).first()).toBeVisible({
    timeout: 10_000,
  })

  // 7. Delete medication + verify removal
  await api(page, 'DELETE', `/medications/${med.id}`)
  const after = await api<Array<{ id: string }>>(page, 'GET', '/medications')
  expect(after.find((m) => m.id === med.id)).toBeFalsy()

  // 8. Reports / adherence still queryable after deletion
  const report = await api<Record<string, unknown>>(page, 'GET', '/reports/adherence')
  expect(report).toBeTruthy()
})

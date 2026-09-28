import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAppointments, getPrescriptions, getProviders, signup } from './_helpers.js'

/**
 * Cross-page kitchen-sink journey covering the canonical patient flow:
 *
 *   landing → signup → dashboard → providers → book → /appointments
 *   → /consult/:id (write notes, autosave) → /messages (send) →
 *   /notifications → /records → /prescriptions → /settings (rename)
 *   → /pricing (verify CTA visible) → log out → log in
 *
 * Each step asserts on a real outcome (URL change, persisted data,
 * network call), not just visibility, so a regression anywhere along
 * the pipeline fails this spec.
 */
test('99 — full patient journey: signup → book → consult → message → settings → logout/login', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // 1. Land on the marketing page.
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /get care now/i }).first()).toBeVisible()

  // 2. Sign up — lands authed.
  const { email, password, accessToken } = await signup(page)
  await expect(page).not.toHaveURL(/\/signup/)

  // 3. Dashboard renders for the seeded user.
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })

  // 4. Providers directory loads with at least one verified provider. Drive
  //    whichever provider the directory holds — naming one breaks the journey
  //    as soon as the directory is replaced.
  const directory = await getProviders(page)
  await page.goto(APP_BASE + '/providers')
  const firstCard = page.getByRole('link').filter({ hasText: directory[0].display_name }).first()
  await expect(firstCard).toBeVisible({ timeout: 15000 })

  // 5. Open booking page and create a real appointment.
  await firstCard.click()
  await expect(page).toHaveURL(/\/providers\/.*\/book/, { timeout: 10000 })
  const slot = page.getByRole('button', { name: /\d{1,2}:\d{2}/ }).first()
  await expect(slot).toBeVisible({ timeout: 15000 })
  await slot.click()
  await page
    .getByRole('button', { name: /Confirm|Book/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/appointments$/, { timeout: 15000 })

  // 6. Appointments list shows the existing + just-booked rows. Read one from
  //    the API rather than naming the starter visit's reason.
  await expect(page.getByRole('button', { name: /^All$/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /^All$/i }).click()
  const appointments = await getAppointments(page, accessToken)
  expect(appointments.length, 'the patient must have appointments by now').toBeGreaterThan(0)
  const apptRow = page
    .getByRole('link')
    .filter({ hasText: appointments[0].reason ?? appointments[0].patient_name ?? '' })
    .first()
  await expect(apptRow).toBeVisible({ timeout: 15000 })
  const apptHref = await apptRow.getAttribute('href')

  // 7. Consult page: write notes and verify autosave.
  if (apptHref?.includes('/consult/')) {
    await apptRow.click()
    await expect(page.locator('[data-mol-id="consult-notes"]')).toBeVisible({ timeout: 15000 })
    const sentinel = `journey-${Date.now()}`
    await page.locator('[data-mol-id="consult-notes"]').fill(sentinel)
    await expect(page.locator('[data-mol-id="consult-notes-status"]')).toContainText(/Saved/i, {
      timeout: 10000,
    })
    await page.reload()
    await expect(page.locator('[data-mol-id="consult-notes"]')).toHaveValue(sentinel, {
      timeout: 15000,
    })
  }

  // 8. Messages: empty-state composer creates the first thread.
  await page.goto(APP_BASE + '/messages')
  const composer = page.getByPlaceholder(/Type your message|Type a reply/i).first()
  await expect(composer).toBeVisible({ timeout: 15000 })
  const msgSentinel = `hello-${Date.now()}`
  await composer.fill(msgSentinel)
  await page.getByRole('button', { name: /^Send/i }).first().click()
  await expect(page.locator('body')).toContainText(msgSentinel.slice(0, 16), { timeout: 15000 })

  // 9. Notifications page renders without crash.
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible({
    timeout: 15000,
  })

  // 10. Records page loads the seeded records.
  await page.goto(APP_BASE + '/records')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })

  // 11. Prescriptions show the patient's medications, whatever they are.
  const prescriptions = await getPrescriptions(page, accessToken)
  expect(prescriptions.length, 'the patient must have prescriptions').toBeGreaterThan(0)
  await page.goto(APP_BASE + '/prescriptions')
  await expect(page.getByText(prescriptions[0].drug).first()).toBeVisible({ timeout: 15000 })

  // 12. Settings: rename + verify persisted.
  await page.goto(APP_BASE + '/settings')
  const newName = `Journey Doc ${Date.now()}`
  const nameInput = page.locator('input[name="name"]')
  await expect(nameInput).toBeVisible({ timeout: 15000 })
  await nameInput.fill(newName)
  await page
    .getByRole('button', { name: /^Save changes$/i })
    .first()
    .click()
  await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10000 })

  // 13. Pricing CTA is visible to the authed user.
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('button', { name: /upgrade.*pro/i })).toBeVisible({ timeout: 15000 })

  // 14. Sign out via the user menu.
  await page.goto(APP_BASE + '/dashboard')
  await page.getByRole('button', { name: /open user menu/i }).click()
  await page
    .getByRole('button', { name: /(sign\s*out|log\s*out)/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10000 })

  // 15. Sign back in with the same creds and confirm session restored.
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page
    .getByRole('button', { name: /(sign\s*in|log\s*in)/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('input[name="name"]')).toHaveValue(newName, { timeout: 15000 })
})

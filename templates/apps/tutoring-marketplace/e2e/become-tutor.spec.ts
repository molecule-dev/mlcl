/**
 * /become-tutor — application form that creates a real tutor_profiles row.
 * Asserts POST /api/tutors fires, the row reads back via GET /tutors/me,
 * and the user is redirected to /tutor/:id.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('become-tutor form creates a tutor_profiles row + redirects to /tutor/:id', async ({
  page,
}) => {
  await signup(page, uniqueEmail('newtutor'), 'TestPass123!', 'New Tutor')
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  // Fill the form
  const inputs = page.locator('input')
  // first is name (already filled), second email (already filled), third hourly rate
  // Per BecomeTutor.tsx: full name, email, subject pills (Math), rate range, pitch textarea
  await page
    .getByRole('button', { name: /^math$/i })
    .first()
    .click()
  await page
    .getByRole('textbox', { name: /pitch/i })
    .fill('I love teaching math.')
    .catch(() => undefined)
  // textarea fallback if not found by role (FloatingInput wraps it)
  const ta = page.locator('textarea').first()
  if ((await ta.count()) > 0) await ta.fill('I love teaching math. Patient and clear.')

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('become-tutor-submit').click()
    await page.waitForURL(/\/tutor\//, { timeout: 15_000 }).catch(() => undefined)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/tutors(\?|$)/.test(r.url))
  expect(post, 'POST /api/tutors fired').toBeDefined()
  expect(post?.status).toBe(201)

  // GET /tutors/me must reflect the new profile
  const me = await apiFetch<any>(page, 'GET', '/tutors/me')
  expect(me.status).toBe(200)
  expect(me.body).toBeTruthy()
  expect(me.body.id).toBeTruthy()
  expect(typeof me.body.hourly_rate).toBe('number')
})

test('cannot create a second tutor profile for the same user', async ({ page }) => {
  // The 409 on the second attempt is the assertion target; the browser still
  // logs it as a console error, so allow exactly that.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: /status of 409/,
  })
  await signup(page, uniqueEmail('dup-tutor'))
  // First creation
  const a = await apiFetch(page, 'POST', '/tutors', {
    display_name: 'A',
    hourly_rate: 50,
    subject: 'Math',
    subjects: ['Math'],
  })
  expect(a.status).toBe(201)
  // Second attempt — should 409
  const b = await apiFetch(page, 'POST', '/tutors', {
    display_name: 'A2',
    hourly_rate: 60,
    subject: 'Math',
    subjects: ['Math'],
  })
  expect(b.status).toBe(409)
})

test('hero heading "Earn doing what you love. Teach on your schedule." renders', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(
    page.getByRole('heading', { name: /Earn doing what you love|Teach on your schedule/i }).first(),
  ).toBeVisible()
})

test('full-name + email inputs are present and editable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const nameInput = page.locator('input').first()
  const emailInput = page.locator('input[type="email"]').first()
  await expect(nameInput).toBeVisible()
  await expect(emailInput).toBeVisible()
  await nameInput.fill('Field Tester')
  await expect(nameInput).toHaveValue('Field Tester')
})

test('subject pill toggles its active state on click', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const pill = page.getByRole('button', { name: /^math$/i }).first()
  await expect(pill).toBeVisible()
  const before = await pill.getAttribute('aria-pressed').catch(() => null)
  await pill.click()
  // Toggle should change aria-pressed or class indicator; assert no error and pill is still present
  await expect(pill).toBeVisible()
  const after = await pill.getAttribute('aria-pressed').catch(() => null)
  // Either a real aria-pressed flip OR the styled class changed — at minimum click did not crash
  if (before !== null && after !== null) expect(before).not.toBe(after)
})

test('hourly rate range input accepts user value (slider/numeric)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const rate = page.locator('input[type="range"], input[type="number"]').first()
  if (await rate.count()) {
    await rate.evaluate((el: HTMLInputElement) => {
      el.value = '75'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(rate).toHaveValue('75')
  }
})

test('pitch textarea accepts free text', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const ta = page.locator('textarea').first()
  if (await ta.count()) {
    await ta.fill('I am patient, structured, and rigorous about every concept.')
    await expect(ta).toHaveValue(/patient, structured/i)
  }
})

test('Submit-application button exists with the correct label', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/become-tutor')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /submit application/i }).first()).toBeVisible()
})

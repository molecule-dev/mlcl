/**
 * Cross-page kitchen-sink user journey. A single user signs up, walks
 * through every primary feature (topic creation → AI tutor → quiz →
 * results → settings → billing → profile → reset password), and we
 * assert real backend invariants at each step.
 *
 * If this passes end-to-end, every wiring point in the app is healthy.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { Client } from 'pg'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getAccessToken,
  uniqueEmail,
} from './_helpers.js'

test.describe.configure({ timeout: 240_000 })

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://molecule:molecule@127.0.0.1:5432/ai_study_buddy_test'

test('end-to-end journey: signup → topic → tutor → quiz → results → settings → billing → reset', async ({
  page,
}) => {
  // === 1. Signup ===
  const email = uniqueEmail('journey')
  const password = 'JourneyPass123!'
  const name = 'Journey User'
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-mol-id="signup-name"]').fill(name)
  await page.locator('[data-mol-id="signup-email"]').fill(email)
  await page.locator('[data-mol-id="signup-password"]').fill(password)
  await page.locator('[data-mol-id="signup-submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  const accessToken = (await getAccessToken(page)) ?? ''
  expect(accessToken).toBeTruthy()

  // === 2. Dashboard renders ===
  await expect(page.locator('main, [data-mol-id^="page-"]').first()).toBeVisible()

  // === 3. Create a topic via the API (UI nav lives in /courses) ===
  const topicTitle = `Journey Topic ${Date.now()}`
  const topic = await page.request.post(`${API_BASE}/topics`, {
    headers: apiHeaders(accessToken),
    data: {
      title: topicTitle,
      description: 'Created during user-journey kitchen-sink test',
      subject: 'biology',
    },
  })
  expect(topic.status()).toBe(201)
  const topicJson = (await topic.json()) as { id: string }

  // === 4. Visit /courses and confirm read-after-write ===
  await page.goto(APP_BASE + '/courses')
  await expect(page.getByText(topicTitle)).toBeVisible()

  // === 5. Visit /study/:id, confirm composer renders ===
  await page.goto(`${APP_BASE}/study/${topicJson.id}`)
  await expect(page.locator('[data-mol-id="study-composer-input"]')).toBeVisible({
    timeout: 15_000,
  })

  // === 6. Generate + submit a quiz via API ===
  const gen = await page.request.post(`${API_BASE}/quizzes/generate`, {
    headers: apiHeaders(accessToken),
    data: { topicId: topicJson.id, questionCount: 3, difficulty: 'easy' },
    timeout: 90_000,
  })
  expect(gen.status()).toBe(201)
  const quiz = (await gen.json()) as {
    id: string
    questions: Array<{ correct_index: number }>
  }
  const submit = await page.request.post(`${API_BASE}/quizzes/${quiz.id}/submit`, {
    headers: apiHeaders(accessToken),
    data: { answers: quiz.questions.map((q) => q.correct_index) },
  })
  expect(submit.status()).toBe(200)

  // === 7. /quiz/:id/results shows 100% ===
  await page.goto(`${APP_BASE}/quiz/${quiz.id}/results`)
  await expect(page.locator('[data-mol-id="results-score"]')).toContainText('100')

  // === 8. /settings persists preferences across reload ===
  await page.goto(APP_BASE + '/settings')
  await page
    .locator('input[type="range"]#goal')
    .first()
    .evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(el, '90')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
  await page.locator('input[type="radio"][value="hard"]').click()
  await page.getByRole('button', { name: /^save changes$/i }).click()
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5_000 })
  await page.reload()
  await expect(page.locator('input[type="range"]#goal')).toHaveValue('90')
  await expect(page.locator('input[type="radio"][value="hard"]')).toBeChecked()

  // === 9. /billing renders + tiers fetch ===
  const billingReqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/billing')
    await page.waitForTimeout(2000)
  })
  const tiers = billingReqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
  expect(tiers?.status).toBe(200)

  // === 10. /profile renders the signed-in identity ===
  await page.goto(APP_BASE + '/profile')
  await expect(page.locator('[data-mol-id="page-profile"]')).toBeVisible()

  // === 11. Password reset round-trip ===
  await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
    failOnStatusCode: false,
  })
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  let token = ''
  try {
    const rows = await client.query<{ token: string | null }>(
      `SELECT s."passwordResetToken" AS token
         FROM users u JOIN "usersSecrets" s ON s.id = u.id
        WHERE u.email = $1`,
      [email],
    )
    token = rows.rows[0]?.token ?? ''
  } finally {
    await client.end()
  }
  expect(token).toBeTruthy()
  const newPassword = 'JourneyNewPass456!'
  const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token, password: newPassword },
    failOnStatusCode: false,
  })
  expect(reset.status()).toBe(200)
  const newLogin = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: newPassword },
    failOnStatusCode: false,
  })
  expect(newLogin.status()).toBe(200)

  // === 12. /notifications shows for the same user ===
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-mol-id="page-notifications"]')).toBeVisible()
})

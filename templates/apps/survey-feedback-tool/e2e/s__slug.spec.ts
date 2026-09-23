import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  addQuestion,
  authedRequest,
  captureNetwork,
  createSurvey,
  publishSurvey,
  signup,
  submitPublicResponse,
} from './_helpers.js'

test.describe('public survey /s/:slug', () => {
  test('UI: walk through all question types, submit, land on thank-you', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Public Walk')
    const text = await addQuestion(page, u.accessToken, s.id, {
      type: 'short_text',
      text: 'How are you?',
    })
    const single = await addQuestion(page, u.accessToken, s.id, {
      type: 'single_choice',
      text: 'Pick one',
      options: ['A', 'B'],
    })
    const multi = await addQuestion(page, u.accessToken, s.id, {
      type: 'multi_choice',
      text: 'Pick many',
      options: ['X', 'Y', 'Z'],
    })
    const num = await addQuestion(page, u.accessToken, s.id, {
      type: 'number',
      text: 'A number',
    })
    const long = await addQuestion(page, u.accessToken, s.id, {
      type: 'long_text',
      text: 'Tell us more',
    })
    const nps = await addQuestion(page, u.accessToken, s.id, {
      type: 'nps',
      text: 'Recommend?',
    })

    const published = await publishSurvey(page, u.accessToken, s.id)
    expect(published.slug).toBeTruthy()

    await page.goto(`${APP_BASE}/s/${published.slug}`)
    // First question heading visible
    await expect(page.getByRole('heading', { name: 'How are you?' })).toBeVisible({
      timeout: 15_000,
    })

    // Step 1: short_text
    await page.locator('input[type="text"]').first().fill('fine, thanks')
    await page
      .getByRole('button', { name: /^next$/i })
      .first()
      .click()

    // Step 2: single_choice — first radio (option A)
    await expect(page.getByRole('heading', { name: 'Pick one' })).toBeVisible()
    await page.getByRole('radio').first().click()
    await page
      .getByRole('button', { name: /^next$/i })
      .first()
      .click()

    // Step 3: multi_choice — pick first option
    await expect(page.getByRole('heading', { name: 'Pick many' })).toBeVisible()
    await page.getByRole('radio').first().click()
    await page
      .getByRole('button', { name: /^next$/i })
      .first()
      .click()

    // Step 4: number
    await expect(page.getByRole('heading', { name: 'A number' })).toBeVisible()
    await page.locator('input[type="number"]').first().fill('7')
    await page
      .getByRole('button', { name: /^next$/i })
      .first()
      .click()

    // Step 5: long_text
    await expect(page.getByRole('heading', { name: 'Tell us more' })).toBeVisible()
    await page.locator('textarea').first().fill('Detailed feedback paragraph.')
    await page
      .getByRole('button', { name: /^next$/i })
      .first()
      .click()

    // Step 6: NPS — pick 9
    await expect(page.getByRole('heading', { name: 'Recommend?' })).toBeVisible()
    await page.getByRole('radio', { name: '9' }).first().click()

    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => r.url().endsWith('/api/responses') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page
        .getByRole('button', { name: /^submit/i })
        .first()
        .click()
      const resp = await respPromise
      expect(resp.status()).toBe(201)
      // Outcome: navigated to thank-you
      await expect(page).toHaveURL(/\/s\/[^/]+\/thank-you$/, { timeout: 10_000 })
    })

    expect(
      reqs.some((r) => r.method === 'POST' && r.url.endsWith('/api/responses') && r.status === 201),
      'expected POST /api/responses to succeed',
    ).toBe(true)

    // Persistence invariant: response is in DB
    const list = await authedRequest(page, u.accessToken, 'GET', `/responses?survey_id=${s.id}`)
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{
      score: number | null
      answers: Record<string, unknown>
    }>
    expect(rows.length).toBe(1)
    expect(rows[0].answers[long.id]).toBe('Detailed feedback paragraph.')
    expect(String(rows[0].answers[num.id])).toBe('7')
    expect(String(rows[0].answers[text.id])).toBe('fine, thanks')
    expect(rows[0].answers[single.id]).toBeTruthy()
    expect(rows[0].answers[multi.id]).toBeTruthy()
    // NPS score: PublicSurvey hoists the nps answer into `score`
    expect(typeof rows[0].score).toBe('number')
    expect(rows[0].score).toBe(9)
    expect(rows[0].answers[nps.id]).toBe(9)
  })

  test('REST: GET /api/surveys/by-slug/:slug returns published survey + questions', async ({
    page,
  }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Slug Probe')
    await addQuestion(page, u.accessToken, s.id, { type: 'nps', text: 'Recommend?' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    const r = await page.request.get(`${API_BASE}/surveys/by-slug/${pub.slug}`)
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { id: string; questions: Array<{ type: string }> }
    expect(body.id).toBe(s.id)
    expect(body.questions.find((q) => q.type === 'nps')).toBeTruthy()
  })

  test('REST: unknown slug returns 404', async ({ page }) => {
    const r = await page.request.get(`${API_BASE}/surveys/by-slug/no-such-slug-${Date.now()}`)
    expect(r.status()).toBe(404)
  })

  test('REST: submitting a response persists with score as a number', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Score Probe')
    const nps = await addQuestion(page, u.accessToken, s.id, {
      type: 'nps',
      text: 'Score me',
    })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    const submitted = await submitPublicResponse(
      page,
      { slug: pub.slug ?? undefined },
      { answers: { [nps.id]: 8 }, score: 8, respondent_email: 'rest@example.com' },
    )
    expect(typeof submitted.score).toBe('number')
    expect(submitted.score).toBe(8)
  })

  test('UI: unknown slug shows survey-unavailable copy', async ({ page }) => {
    await page.goto(`${APP_BASE}/s/never-was-${Date.now()}`)
    // The 404 from /api/surveys/by-slug is the test's premise — the browser
    // logs it as a console resource error, which is expected here.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await expect(page.getByText(/not found|unavailable|no longer|invalid/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('UI: number question accepts numeric input', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Number Probe')
    await addQuestion(page, u.accessToken, s.id, { type: 'number', text: 'How many?' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    const numInput = page.locator('input[type="number"]').first()
    await numInput.fill('42')
    await expect(numInput).toHaveValue('42')
  })

  test('UI: long_text textarea is editable', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Textarea Probe')
    await addQuestion(page, u.accessToken, s.id, { type: 'long_text', text: 'Tell us' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    const ta = page.locator('textarea').first()
    await ta.fill('Long form feedback here.')
    await expect(ta).toHaveValue('Long form feedback here.')
  })

  test('UI: NPS 0..10 score radios are present and selectable', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'NPS Probe')
    await addQuestion(page, u.accessToken, s.id, { type: 'nps', text: 'Recommend?' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    for (let i = 0; i <= 10; i++) {
      await expect(page.getByRole('radio', { name: String(i) }).first()).toBeVisible()
    }
    await page.getByRole('radio', { name: '10' }).first().click()
    await expect(page.getByRole('radio', { name: '10' }).first()).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('UI: progress indicator shows "Question 1 of N"', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Progress Probe')
    await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'one' })
    await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'two' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    await expect(page.getByText(/Question 1 of 2/i)).toBeVisible({ timeout: 10_000 })
  })

  test('UI: Back button on second question returns to first', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Back Probe')
    await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'first question' })
    await addQuestion(page, u.accessToken, s.id, { type: 'short_text', text: 'second question' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    await expect(page.getByRole('heading', { name: 'first question' })).toBeVisible()
    await page.locator('input[type="text"]').first().fill('first')
    await page
      .getByRole('button', { name: /^next$/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'second question' })).toBeVisible()
    await page
      .getByRole('button', { name: /^back$/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'first question' })).toBeVisible()
  })

  test('UI: required answer blocks Next button until provided', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Required Probe')
    await addQuestion(page, u.accessToken, s.id, {
      type: 'short_text',
      text: 'must answer',
      required: true,
    })
    await addQuestion(page, u.accessToken, s.id, {
      type: 'short_text',
      text: 'second',
    })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    const nextBtn = page.getByRole('button', { name: /^next$/i }).first()
    await expect(nextBtn).toBeDisabled({ timeout: 10_000 })
    await page.locator('input[type="text"]').first().fill('answered')
    await expect(nextBtn).toBeEnabled()
  })

  test('REST: missing required answer is rejected', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Server-side Required Probe')
    await addQuestion(page, u.accessToken, s.id, {
      type: 'short_text',
      text: 'Required',
      required: true,
    })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    const res = await page.request.post(`${API_BASE}/responses`, {
      headers: { 'Content-Type': 'application/json' },
      data: { slug: pub.slug, answers: {} },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('"Learn more" link navigates to /', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Learn More')
    await addQuestion(page, u.accessToken, s.id, { type: 'nps', text: 'Recommend?' })
    const pub = await publishSurvey(page, u.accessToken, s.id)
    await page.goto(`${APP_BASE}/s/${pub.slug}`)
    await page
      .getByRole('link', { name: /learn more/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })
})

/**
 * /study/:id — interactive AI tutor session for a topic. Verifies the
 * page renders the topic context, the composer input + send button are
 * present, and the chat list area is visible.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedTopic, signup } from './_helpers.js'

test.describe.configure({ timeout: 120_000 })

test('/study/:id renders page-study container after auth', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Algebra Basics' })
  await page.goto(`${APP_BASE}/study/${topic.id}`)
  await expect(page.locator('[data-mol-id="page-study"]')).toBeVisible({ timeout: 15_000 })
})

test('/study/:id shows the topic title in the header', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Geometry Basics' })
  await page.goto(`${APP_BASE}/study/${topic.id}`)
  await expect(page.getByRole('heading', { name: /geometry basics/i })).toBeVisible({
    timeout: 15_000,
  })
})

test('/study/:id composer input + send button exist', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Photosynthesis Topic' })
  await page.goto(`${APP_BASE}/study/${topic.id}`)
  await expect(page.locator('[data-mol-id="study-composer-input"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="study-composer-send"]')).toBeVisible()
})

test('/study/:id is auth-gated (anon redirects to /login)', async ({ page }) => {
  const fakeId = '00000000-0000-0000-0000-000000000000'
  await page.goto(`${APP_BASE}/study/${fakeId}`)
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/study/:id mount fans out to /topics/:id + /materials', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Genetics' })
  const reqs = await captureNetwork(page, async () => {
    const topicFetch = page.waitForResponse(
      (r) =>
        new RegExp(`/api/topics/${topic.id}(\\?|$)`).test(r.url()) &&
        r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    const materialsFetch = page.waitForResponse(
      (r) =>
        new RegExp(`/api/topics/${topic.id}/materials`).test(r.url()) &&
        r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(`${APP_BASE}/study/${topic.id}`)
    await Promise.all([topicFetch, materialsFetch])
    await expect(page.locator('[data-mol-id="page-study"]')).toBeVisible({ timeout: 15_000 })
  })
  expect(reqs.find((r) => /\/topics\/[^/]+$/.test(r.url) && r.method === 'GET')?.status).toBe(200)
  expect(
    reqs.find((r) => /\/topics\/[^/]+\/materials/.test(r.url) && r.method === 'GET')?.status,
  ).toBe(200)
})

test('/study/:id ask composer POSTs /topics/:id/ask and renders the AI reply', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Newton’s Laws' })
  // First, prove the backend invariant directly: POST /topics/:id/ask returns
  // a real, non-empty AI answer. This is the "production-ready" contract —
  // the user clicks Send and gets a real Claude response.
  const direct = await page.request.post(`${API_BASE}/topics/${topic.id}/ask`, {
    headers: apiHeaders(accessToken),
    data: { question: 'Explain inertia.' },
    timeout: 90_000,
  })
  expect(direct.status(), await direct.text()).toBe(200)
  const directBody = (await direct.json()) as { answer: string }
  expect(directBody.answer.length).toBeGreaterThan(50)

  // Now drive the same flow through the UI — load the page, type into the
  // composer, click Send, and assert that captureNetwork sees the POST and
  // the chat grows to ≥3 list items (welcome + user + AI reply).
  await page.goto(`${APP_BASE}/study/${topic.id}`)
  await expect(page.locator('[data-mol-id="study-composer-input"]')).toBeVisible({
    timeout: 15_000,
  })
  // Wait for the chat ol's welcome listitem so we know /topics/:id resolved.
  // The chat <ol> has no data-mol-id of its own, so we anchor on the ol that
  // sits inside the <main> (sidebar nav has no list role on its <ul>).
  const chatList = page.locator('main ol').first()
  await expect(chatList.locator('li').first()).toBeVisible({ timeout: 15_000 })

  const composer = page.locator('[data-mol-id="study-composer-input"]')
  await composer.click()
  await composer.pressSequentially('Explain inertia.', { delay: 10 })
  await expect(composer).toHaveValue(/Explain inertia/i)

  const reqs = await captureNetwork(page, async () => {
    // Use Enter on the input — submits the enclosing <form> via native
    // submit, which avoids any "click handler bailed because asking==true"
    // race that a discrete button-click might trigger.
    const ask = page.waitForResponse(
      (r) => /\/api\/topics\/[^/]+\/ask/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    )
    await composer.press('Enter')
    const askResp = await ask
    expect(askResp.status()).toBe(200)
    // After the response settles, the chat list should also grow to include
    // the AI reply (welcome + user + AI reply ≥ 3 listitems; "Thinking…"
    // disappears once setAsking(false) runs).
    await expect
      .poll(
        async () => {
          const txt = await chatList.innerText()
          return /Thinking…/.test(txt)
        },
        { timeout: 30_000, intervals: [500, 1000] },
      )
      .toBe(false)
    expect(await chatList.locator('li').count()).toBeGreaterThanOrEqual(3)
  })
  const askCall = reqs.find((r) => /\/topics\/[^/]+\/ask/.test(r.url) && r.method === 'POST')
  expect(askCall, 'topics/:id/ask was not invoked').toBeDefined()
  expect(askCall?.status).toBe(200)
})

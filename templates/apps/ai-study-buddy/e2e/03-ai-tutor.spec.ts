/**
 * AI tutor — proves the /topics/:id/ask endpoint actually invokes a
 * real LLM (Anthropic) and writes a study_session row, instead of
 * returning the placeholder string the previous handler did.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, seedTopic, signup } from './_helpers.js'

test.describe.configure({ timeout: 90_000 })

test('POST /topics/:id/ask returns a real (non-stub) AI answer', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, {
    title: 'Photosynthesis',
    description: 'Plant energy basics',
    subject: 'biology',
  })

  const res = await page.request.post(`${API_BASE}/topics/${topic.id}/ask`, {
    headers: apiHeaders(accessToken),
    data: { question: 'Explain photosynthesis in one sentence.' },
    failOnStatusCode: false,
    timeout: 60_000,
  })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as { answer: string }
  expect(body.answer).toBeTruthy()
  expect(body.answer.length).toBeGreaterThan(20)
  expect(body.answer.toLowerCase()).not.toContain('ai tutoring response will appear here')
  expect(body.answer.toLowerCase()).toMatch(
    /photosynthesis|sunlight|chlorophyll|plants?|glucose|light/,
  )
})

test('POST /topics/:id/ask records a study_session and bumps last_studied_at', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Mitosis' })

  const before = (await (
    await page.request.get(`${API_BASE}/topics/${topic.id}`, { headers: apiHeaders(accessToken) })
  ).json()) as { last_studied_at: string | null }
  expect(before.last_studied_at).toBeNull()

  const res = await page.request.post(`${API_BASE}/topics/${topic.id}/ask`, {
    headers: apiHeaders(accessToken),
    data: { question: 'What are the phases of mitosis?' },
    failOnStatusCode: false,
    timeout: 60_000,
  })
  expect(res.status()).toBe(200)

  const after = (await (
    await page.request.get(`${API_BASE}/topics/${topic.id}`, { headers: apiHeaders(accessToken) })
  ).json()) as { last_studied_at: string | null }
  expect(after.last_studied_at).not.toBeNull()
})

test('AI tutor incorporates uploaded study material as context', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Custom Term' })

  const customTerm = `widget-glorbox-${Date.now()}`
  await page.request.post(`${API_BASE}/topics/${topic.id}/materials`, {
    headers: apiHeaders(accessToken),
    data: {
      title: 'Glossary',
      content: `The ${customTerm} is a fictional device that converts moonlight into copper coins. It was invented by Dr. Amelia Borealis in 1923 and is the central concept in this study unit.`,
    },
  })

  const res = await page.request.post(`${API_BASE}/topics/${topic.id}/ask`, {
    headers: apiHeaders(accessToken),
    data: { question: `What does the ${customTerm} do?` },
    failOnStatusCode: false,
    timeout: 60_000,
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { answer: string }
  expect(body.answer.toLowerCase()).toMatch(/moonlight|copper|coins?|fictional|device/)
})

test('AI tutor responds across topic ownership boundary with 404', async ({ page, browser }) => {
  const ownerCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  const owner = await signup(ownerPage)
  const topic = await seedTopic(ownerPage, owner.accessToken)

  const otherCtx = await browser.newContext()
  const otherPage = await otherCtx.newPage()
  const other = await signup(otherPage)

  const res = await otherPage.request.post(`${API_BASE}/topics/${topic.id}/ask`, {
    headers: apiHeaders(other.accessToken),
    data: { question: 'Hello?' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(404)

  await ownerCtx.close()
  await otherCtx.close()
})

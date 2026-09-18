// E2E test helpers for the survey-feedback-tool flagship.
// Every spec imports auth/network plumbing from here so each test starts
// from a fresh, isolated user. Helpers prefer hitting the API directly
// for setup (it's faster and isolates the test from UI flake). Auth uses
// the httpOnly `token` cookie set by the server on signup/login — no
// localStorage seeding required.

import { Page, expect, APIResponse } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'sft') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  accessToken: string
  userId: string
}

/**
 * Sign up a fresh user via the API. The server sets an httpOnly `token` cookie
 * on the response, which Playwright's context carries automatically — no
 * localStorage seeding needed. Returns credentials + accessToken (from the
 * response body) for subsequent `authedRequest` calls.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<SignupResult> {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'SFT Tester' },
  })
  expect(res.status(), `signup should return 201, body: ${await safeText(res)}`).toBe(201)
  const body = (await res.json()) as { accessToken?: string; props?: { id?: string } }
  if (!body.accessToken) {
    throw new Error('signup did not return accessToken: ' + JSON.stringify(body))
  }
  return {
    email,
    password,
    accessToken: body.accessToken,
    userId: String(body.props?.id ?? ''),
  }
}

/** Make an authenticated REST request from the test runner. */
export async function authedRequest(
  page: Page,
  token: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<APIResponse> {
  const url = path.startsWith('http') ? path : API_BASE + path
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (method === 'GET') return page.request.get(url, { headers })
  if (method === 'DELETE') return page.request.delete(url, { headers })
  if (method === 'PATCH') return page.request.patch(url, { headers, data: data ?? {} })
  return page.request.post(url, { headers, data: data ?? {} })
}

export interface SurveyApi {
  id: string
  owner_id: string
  title: string
  slug: string | null
  status: string
  response_count: number
}

export async function createSurvey(
  page: Page,
  token: string,
  title: string,
  description = '',
): Promise<SurveyApi> {
  const res = await authedRequest(page, token, 'POST', '/surveys', { title, description })
  expect(res.status(), `POST /surveys: ${await safeText(res)}`).toBe(201)
  return (await res.json()) as SurveyApi
}

export interface QuestionApi {
  id: string
  survey_id: string
  type: string
  text: string
  options: string[] | null
  required: boolean
  position: number
}

export async function addQuestion(
  page: Page,
  token: string,
  surveyId: string,
  q: { type: string; text: string; options?: string[]; required?: boolean },
): Promise<QuestionApi> {
  const res = await authedRequest(page, token, 'POST', '/questions', {
    survey_id: surveyId,
    type: q.type,
    text: q.text,
    required: q.required ?? false,
    ...(q.options ? { options: q.options } : {}),
  })
  expect(res.status(), `POST /questions: ${await safeText(res)}`).toBe(201)
  return (await res.json()) as QuestionApi
}

export async function publishSurvey(
  page: Page,
  token: string,
  surveyId: string,
): Promise<SurveyApi> {
  const res = await authedRequest(page, token, 'POST', `/surveys/${surveyId}/publish`)
  expect(res.status(), `POST /surveys/${surveyId}/publish: ${await safeText(res)}`).toBe(200)
  return (await res.json()) as SurveyApi
}

export async function submitPublicResponse(
  page: Page,
  surveyOrSlug: { surveyId?: string; slug?: string },
  payload: {
    answers: Record<string, unknown>
    score?: number
    respondent_email?: string
  },
): Promise<{ id: string; score: number | null; answers: Record<string, unknown> }> {
  const data: Record<string, unknown> = {
    answers: payload.answers,
    ...(payload.score != null ? { score: payload.score } : {}),
    ...(payload.respondent_email ? { respondent_email: payload.respondent_email } : {}),
    ...(surveyOrSlug.slug ? { slug: surveyOrSlug.slug } : { survey_id: surveyOrSlug.surveyId }),
  }
  const res = await page.request.post(`${API_BASE}/responses`, {
    headers: { 'Content-Type': 'application/json' },
    data,
  })
  expect(res.status(), `POST /responses: ${await safeText(res)}`).toBe(201)
  return (await res.json()) as {
    id: string
    score: number | null
    answers: Record<string, unknown>
  }
}

export async function safeText(res: APIResponse): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** Capture every network response during fn. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

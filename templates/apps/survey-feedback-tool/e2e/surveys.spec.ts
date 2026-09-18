import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, authedRequest, createSurvey, signup } from './_helpers.js'

test.describe('surveys CRUD', () => {
  test('create + list + delete via API persists across read', async ({ page }) => {
    const u = await signup(page)
    const survey = await createSurvey(page, u.accessToken, 'Test Survey 1', 'desc')
    expect(survey.id).toMatch(/[0-9a-f-]{36}/)
    expect(survey.title).toBe('Test Survey 1')
    expect(survey.status).toBe('draft')

    const listRes = await authedRequest(page, u.accessToken, 'GET', '/surveys')
    expect(listRes.status()).toBe(200)
    const list = (await listRes.json()) as Array<{ id: string }>
    expect(list.find((s) => s.id === survey.id)).toBeTruthy()

    const delRes = await authedRequest(page, u.accessToken, 'DELETE', `/surveys/${survey.id}`)
    expect(delRes.status()).toBe(204)

    const after = await authedRequest(page, u.accessToken, 'GET', `/surveys/${survey.id}`)
    expect(after.status()).toBe(404)
  })

  test('PATCH /surveys/:id updates title — outcome reflected on subsequent GET', async ({
    page,
  }) => {
    const u = await signup(page)
    const survey = await createSurvey(page, u.accessToken, 'Original Title')
    const patch = await authedRequest(page, u.accessToken, 'PATCH', `/surveys/${survey.id}`, {
      title: 'Renamed Title',
    })
    expect(patch.status()).toBe(200)
    const fresh = await authedRequest(page, u.accessToken, 'GET', `/surveys/${survey.id}`)
    expect(fresh.status()).toBe(200)
    const body = (await fresh.json()) as { title: string }
    expect(body.title).toBe('Renamed Title')
  })

  test('owner cannot read another user surveys (IDOR)', async ({ page }) => {
    const u1 = await signup(page)
    const u1Survey = await createSurvey(page, u1.accessToken, 'U1 private')
    const u2 = await signup(page)
    const stolen = await authedRequest(page, u2.accessToken, 'GET', `/surveys/${u1Survey.id}`)
    expect(stolen.status()).toBe(404)
  })

  test('UI: /surveys page renders the new survey title after creation + reload', async ({
    page,
  }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'UI Survey 999')
    await page.goto(APP_BASE + '/surveys')
    // Wait for the page to actually fetch the surveys list before asserting
    // — the auth-seeded localStorage takes effect on first navigation, and
    // the http client's GET happens after first paint.
    await page.waitForResponse(
      (resp) => resp.url().endsWith('/api/surveys') && resp.status() === 200,
      { timeout: 15_000 },
    )
    await expect(page.getByText('UI Survey 999').first()).toBeVisible({ timeout: 15_000 })
    expect(s.id).toBeTruthy()
  })
})

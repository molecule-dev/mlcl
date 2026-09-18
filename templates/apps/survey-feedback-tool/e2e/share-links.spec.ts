import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { authedRequest, createSurvey, signup } from './_helpers.js'

test.describe('share-links', () => {
  test('owner can mint a share link with a unique url_token', async ({ page }) => {
    const u = await signup(page)
    const s = await createSurvey(page, u.accessToken, 'Share me')
    const create = await authedRequest(page, u.accessToken, 'POST', '/share-links', {
      survey_id: s.id,
      kind: 'public',
    })
    expect(create.status()).toBe(201)
    const body = (await create.json()) as {
      id: string
      survey_id: string
      url_token: string
    }
    expect(body.survey_id).toBe(s.id)
    expect(body.url_token.length).toBeGreaterThanOrEqual(12)

    const list = await authedRequest(page, u.accessToken, 'GET', `/share-links?survey_id=${s.id}`)
    expect(list.status()).toBe(200)
    const items = (await list.json()) as Array<{ id: string }>
    expect(items.find((i) => i.id === body.id)).toBeTruthy()
  })

  test('non-owner cannot list share links for another user survey (IDOR)', async ({ page }) => {
    const u1 = await signup(page)
    const s = await createSurvey(page, u1.accessToken, 'Mine')
    await authedRequest(page, u1.accessToken, 'POST', '/share-links', {
      survey_id: s.id,
      kind: 'public',
    })
    const u2 = await signup(page)
    const stolen = await authedRequest(
      page,
      u2.accessToken,
      'GET',
      `/share-links?survey_id=${s.id}`,
    )
    // either 404 or empty list — both prevent IDOR. Treat empty 200 as ok.
    if (stolen.status() === 200) {
      const body = (await stolen.json()) as Array<unknown>
      expect(body.length).toBe(0)
    } else {
      expect(stolen.status()).toBeGreaterThanOrEqual(400)
    }
  })
})

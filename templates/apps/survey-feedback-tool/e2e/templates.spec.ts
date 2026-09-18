import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { authedRequest, signup } from './_helpers.js'

test.describe('templates', () => {
  test('three public templates are seeded on first boot and visible to every user', async ({
    page,
  }) => {
    const u = await signup(page)
    const list = await authedRequest(page, u.accessToken, 'GET', '/templates')
    expect(list.status()).toBe(200)
    const items = (await list.json()) as Array<{
      id: string
      name: string
      kind: string
      is_public: boolean
    }>
    const publics = items.filter((i) => i.is_public)
    expect(publics.length).toBeGreaterThanOrEqual(3)
    const kinds = publics.map((p) => p.kind)
    expect(kinds).toEqual(expect.arrayContaining(['nps', 'csat', 'product']))
  })

  test('apply template clones questions into a new draft survey', async ({ page }) => {
    const u = await signup(page)
    const list = await authedRequest(page, u.accessToken, 'GET', '/templates')
    const items = (await list.json()) as Array<{ id: string; kind: string; name: string }>
    const nps = items.find((i) => i.kind === 'nps')
    expect(nps, 'nps seed template should exist').toBeTruthy()
    const apply = await authedRequest(page, u.accessToken, 'POST', `/templates/${nps!.id}/apply`)
    expect(apply.status()).toBe(201)
    const survey = (await apply.json()) as { id: string; status: string; owner_id: string }
    expect(survey.status).toBe('draft')
    expect(survey.owner_id).toBe(u.userId)

    const detail = await authedRequest(page, u.accessToken, 'GET', `/surveys/${survey.id}`)
    expect(detail.status()).toBe(200)
    const body = (await detail.json()) as {
      questions: Array<{ type: string }>
    }
    expect(body.questions.length).toBeGreaterThan(0)
    expect(body.questions.find((q) => q.type === 'nps')).toBeTruthy()
  })

  test('user-created template is private to that user', async ({ page }) => {
    const u1 = await signup(page)
    const created = await authedRequest(page, u1.accessToken, 'POST', '/templates', {
      name: 'My private template',
      description: 'd',
      kind: 'general',
      questions: [{ type: 'short_text', text: 'q1' }],
    })
    expect(created.status()).toBe(201)
    const tpl = (await created.json()) as { id: string; is_public: boolean }
    expect(tpl.is_public).toBe(false)

    const u2 = await signup(page)
    const stolen = await authedRequest(page, u2.accessToken, 'GET', `/templates/${tpl.id}`)
    // private template is not in u2's list and direct GET 404s
    expect(stolen.status()).toBe(404)
    const list2 = await authedRequest(page, u2.accessToken, 'GET', '/templates')
    const list2Body = (await list2.json()) as Array<{ id: string }>
    expect(list2Body.find((t) => t.id === tpl.id)).toBeFalsy()
  })
})

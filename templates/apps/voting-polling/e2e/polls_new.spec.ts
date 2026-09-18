import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('/polls/new renders the create-poll heading + title input', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/polls/new')
  await expect(
    page.getByRole('heading', { name: /create|new\s*poll|open\s*the\s*floor/i }).first(),
  ).toBeVisible()
  await expect(page.getByRole('textbox').first()).toBeVisible()
})

test('/polls/new renders ≥2 option inputs by default', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/polls/new')
  const optionInputs = page.locator('input[placeholder*="option" i], input[name*="option" i]')
  await expect(optionInputs.first()).toBeVisible()
  await expect(optionInputs.nth(1)).toBeAttached()
})

test('Submitting the create-poll form persists the new row + leaves /polls/new', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/polls/new')
  const title = `Lunch poll ${Date.now()}`
  await page.getByRole('textbox').first().fill(title)
  const optionInputs = page.locator('input[placeholder*="option" i], input[name*="option" i]')
  if ((await optionInputs.count()) >= 2) {
    await optionInputs.nth(0).fill('Salad')
    await optionInputs.nth(1).fill('Sandwich')
  }
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /save|create|publish|launch/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/polls\/new$/, { timeout: 15_000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/polls(\?|$)/.test(r.url))
  expect(post?.status, 'POST /api/polls').toBeLessThan(300)

  // Read-after-write: the dashboard /api/polls listing now contains the new title.
  const polls = await api<Array<{ id: string; title: string }>>(page, 'GET', '/polls')
  expect(
    polls.find((p) => p.title === title),
    'created poll in /api/polls',
  ).toBeTruthy()
})

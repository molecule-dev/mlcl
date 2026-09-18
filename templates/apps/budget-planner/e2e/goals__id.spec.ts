import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

async function seedGoal(page: any, target = 100000, monthly = 5000) {
  return await api<Record<string, string>>(page, 'POST', '/goals', {
    name: 'Trip Fund',
    target_cents: target,
    monthly_contribution_cents: monthly,
  })
}

test('Detail page shows name, percent, saved/target, monthly + back link', async ({ page }) => {
  await signup(page)
  const g = await seedGoal(page)
  await page.goto(APP_BASE + '/goals/' + g.id)
  await expect(page.getByRole('heading', { name: /trip fund/i })).toBeVisible()
  await expect(page.getByTestId('goal-percent')).toBeVisible()
  await expect(page.getByTestId('goal-saved')).toBeVisible()
  await expect(page.getByRole('link', { name: /all goals/i })).toBeVisible()
})

test('Add contribution updates saved amount and contribution list', async ({ page }) => {
  await signup(page)
  const g = await seedGoal(page, 100000, 5000)
  await page.goto(APP_BASE + '/goals/' + g.id)
  // saved starts at 0
  await expect(page.getByTestId('goal-percent')).toHaveText('0%')
  await page.getByTestId('goal-contribute-amount').fill('50')
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('goal-contribute-submit').click()
    await expect(page.getByTestId('goal-percent')).not.toHaveText('0%', { timeout: 10000 })
  })
  const post = reqs.find(
    (r) => r.method === 'POST' && /\/api\/goals\/[\w-]+\/contributions/.test(r.url),
  )
  expect(post?.status).toBeLessThan(300)
  // Read after write — the goal saved_cents should now be 5000 (50 dollars).
  const refreshed = await api<Record<string, number>>(page, 'GET', `/goals/${g.id}`)
  expect(refreshed.saved_cents).toBe(5000)
  // 5000 / 100000 = 5% — the visible % should reflect that
  await expect(page.getByTestId('goal-percent')).toHaveText('5%')
})

test('Empty contribution amount blocks submission (no POST hits the API)', async ({ page }) => {
  await signup(page)
  const g = await seedGoal(page)
  await page.goto(APP_BASE + '/goals/' + g.id)
  // Leave amount empty
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('goal-contribute-submit').click()
    await page.waitForTimeout(800)
  })
  const post = reqs.find(
    (r) => r.method === 'POST' && /\/api\/goals\/[\w-]+\/contributions/.test(r.url),
  )
  expect(post, 'empty amount should not POST').toBeUndefined()
})

test('Delete goal removes it and navigates back to /goals', async ({ page }) => {
  await signup(page)
  const g = await seedGoal(page)
  await page.goto(APP_BASE + '/goals/' + g.id)
  page.once('dialog', (d) => d.accept())
  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('goal-delete').click()
    await expect(page).toHaveURL(/\/goals(?!\/[\w-]+)/, { timeout: 10000 })
  })
  const del = reqs.find(
    (r) => r.method === 'DELETE' && new RegExp(`/api/goals/${g.id}$`).test(r.url),
  )
  expect(del?.status).toBeLessThan(400)
  const list = await api<Array<Record<string, string>>>(page, 'GET', '/goals')
  expect(list.find((x) => x.id === g.id)).toBeUndefined()
})

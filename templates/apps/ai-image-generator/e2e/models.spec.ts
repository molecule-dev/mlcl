import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/models', () => {
  test('renders Models h1 and fetches list', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/models')
      await expect(page.getByRole('heading', { name: /^Models$/i, level: 1 })).toBeVisible()
    })
    expect(reqs.some((r) => /\/api\/models/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('renders Reverie XL v3 card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    await expect(page.getByRole('heading', { name: /Reverie XL v3/i, level: 2 })).toBeVisible()
  })

  test('renders Reverie Flash card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    await expect(page.getByRole('heading', { name: /Reverie Flash/i, level: 2 })).toBeVisible()
  })

  test('renders Reverie Print card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    await expect(page.getByRole('heading', { name: /Reverie Print/i, level: 2 })).toBeVisible()
  })

  test('shows currently active model "In use" disabled button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    const inUse = page.getByRole('button', { name: /In use/i })
    await expect(inUse).toBeVisible()
    await expect(inUse).toBeDisabled()
  })

  test('"Activate" button POSTs /api/models/:id/activate', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Activate$/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/models\/[^/]+\/activate/.test(r.url) &&
          r.method === 'POST' &&
          r.status >= 200 &&
          r.status < 300,
      ),
    ).toBeTruthy()
  })
})

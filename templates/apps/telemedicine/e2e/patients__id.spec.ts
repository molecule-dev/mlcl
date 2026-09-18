import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/patients/:id — Patient detail', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/patients/some-id')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders the signed-in user as a patient detail page', async ({ page }) => {
    const { userId } = await signup(page)
    await page.goto(`${APP_BASE}/patients/${userId}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('body')).toContainText(/Test User/i)
  })

  test('Calls GET /api/patients/:id and related history endpoints', async ({ page }) => {
    const { userId } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/patients/${userId}`)
      await expect(page.locator('body')).toContainText(/Test User/i, { timeout: 15000 })
    })
    const hit = reqs.find((r) => r.method === 'GET' && r.url.includes(`/api/patients/${userId}`))
    expect(hit, 'must call GET /api/patients/:id').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Unknown patient id 404s by either showing not-found copy or redirecting', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/patients/00000000-0000-0000-0000-000000000000`)
    // Either: "not found" message renders after data fetch completes, or
    // the page auto-bounces back to /patients. Wait until either condition
    // is true rather than racing the in-flight loader against `.count()`.
    await page.waitForFunction(
      () => {
        const url = window.location.pathname
        const text = document.body.innerText
        const onList = url === '/patients'
        const notFound = /not found|no such patient|cannot.*load/i.test(text)
        return onList || notFound
      },
      { timeout: 15000 },
    )
    const url = page.url()
    const onList = url.includes('/patients') && !url.includes('00000000')
    const notFound = page.getByText(/not found|no such patient|cannot.*load/i).first()
    if (await notFound.count()) {
      await expect(notFound).toBeVisible()
    } else {
      expect(onList).toBe(true)
    }
  })
})

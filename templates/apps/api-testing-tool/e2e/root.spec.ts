import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/', () => {
  test('brand link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Pylon\.$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?(?:#top)?$`))
  })

  test('"Sign in" nav link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Start free" nav CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Download free" hero CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Download free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"See plans" hero CTA goes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /See plans/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('"Choose plan" pricing-card CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Choose plan/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('initial page load fetches the index document', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'GET' &&
          /\/(?:index\.html)?$/.test(new URL(r.url).pathname) &&
          r.status === 200,
      ),
      'a 200 response for the landing page document must be observed',
    ).toBeTruthy()
  })
})

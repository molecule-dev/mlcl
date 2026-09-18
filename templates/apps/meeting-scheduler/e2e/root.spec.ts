import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('Landing', () => {
  test('renders Meridian brand + primary CTAs to signup and pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page.getByRole('navigation').getByRole('link', { name: /Meridian/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Create your booking link/i }).first(),
    ).toHaveAttribute('href', /\/signup/)
    await expect(page.getByRole('link', { name: /See pricing/i })).toHaveAttribute(
      'href',
      /\/pricing/,
    )
  })

  test('CTA button navigates to signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start scheduling/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('feature cards describe core scheduler value props', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /availability/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /booking links/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /calendar sync/i })).toBeVisible()
  })

  test('navbar Meridian brand link is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: /Meridian/i })
        .first(),
    ).toBeVisible()
  })

  test('See pricing link routes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /See pricing/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing$/)
  })
})

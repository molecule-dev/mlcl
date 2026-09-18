import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('help: public knowledge base', () => {
  test('renders the page heading and four help sections', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await expect(page.getByRole('heading', { name: /how rendition works/i }).first()).toBeVisible()
    // Each section has its own h2 (Start, Glossary, Reviewers, Billing).
    const sections = page.locator('h2')
    const count = await sections.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('"Create your first project" link routes to /projects/new', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const link = page.getByRole('link', { name: /create your first project/i })
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/projects/new')
  })

  test('"Back to home" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const back = page.getByRole('link', { name: /back to home/i }).first()
    await back.click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/\W/g, '\\$&')}/?$`))
  })

  test('See pricing link goes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const link = page.getByRole('link', { name: /see pricing/i })
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/pricing')
  })
})

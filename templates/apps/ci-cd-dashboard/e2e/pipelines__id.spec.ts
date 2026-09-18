import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getFirstPipelineId, signup, whereUrl } from './_helpers.js'

test.describe('/pipelines/:id', () => {
  test('renders pipeline detail with heading + back link', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    await page.goto(APP_BASE + '/pipelines/' + id)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /All pipelines/i })).toBeVisible()
  })

  test('All pipelines link returns to /pipelines', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    await page.goto(APP_BASE + '/pipelines/' + id)
    await page.getByRole('link', { name: /All pipelines/i }).click()
    await expect(page).toHaveURL(/\/pipelines(?:#top)?$/)
  })

  test('shows Commit / Branch / Duration / Triggered by metadata', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    await page.goto(APP_BASE + '/pipelines/' + id)
    await expect(page.getByText(/Commit/i).first()).toBeVisible()
    await expect(page.getByText(/Branch/i).first()).toBeVisible()
    await expect(page.getByText(/Duration/i).first()).toBeVisible()
    await expect(page.getByText(/Triggered by/i).first()).toBeVisible()
  })

  test('shows Stages section with at least one stage button', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    await page.goto(APP_BASE + '/pipelines/' + id)
    await expect(page.getByRole('heading', { name: /^Stages$/i })).toBeVisible()
    const stageBtns = page.locator('main button[aria-expanded]')
    await expect(stageBtns.first()).toBeAttached()
  })

  test('expanding a stage button toggles aria-expanded', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    await page.goto(APP_BASE + '/pipelines/' + id)
    const firstStage = page.locator('main button[aria-expanded]').first()
    const before = await firstStage.getAttribute('aria-expanded')
    await firstStage.click()
    await page.waitForTimeout(200)
    const after = await firstStage.getAttribute('aria-expanded')
    expect(after).not.toBe(before)
  })

  test('sidebar shows Coverage + Artifacts list (find a passed pipeline first)', async ({
    page,
  }) => {
    await signup(page)
    // Find a passed pipeline (queued/running pipelines have no coverage/artifacts)
    await page.goto(APP_BASE + '/pipelines')
    await page.getByRole('button', { name: /^Passed\s+\d+$/i }).click()
    await page.waitForTimeout(500)
    const link = page.locator('a[href^="/pipelines/"]').first()
    await link.waitFor({ timeout: 10000 })
    await link.click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Coverage/i).first()).toBeVisible()
    await expect(page.getByText(/^Artifacts/i).first()).toBeVisible()
  })

  test('GET /api/pipelines/:id fires on page load', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pipelines/' + id)
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, new RegExp(`/api/pipelines/${id}`), 'GET')
    expect(get.length, 'GET /api/pipelines/:id fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('reload preserves the pipeline detail (state survives reload)', async ({ page }) => {
    await signup(page)
    const id = await getFirstPipelineId(page)
    await page.goto(APP_BASE + '/pipelines/' + id)
    const headingBefore = await page.getByRole('heading', { level: 1 }).textContent()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const headingAfter = await page.getByRole('heading', { level: 1 }).textContent()
    expect(headingAfter).toBe(headingBefore)
  })
})

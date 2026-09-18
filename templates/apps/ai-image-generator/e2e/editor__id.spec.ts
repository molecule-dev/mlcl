import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getFirstImageId, signup } from './_helpers.js'

test.describe('/editor/:id', () => {
  test('renders Editor h1 and fetches the source image', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/editor/${id}`)
      await expect(page.getByRole('heading', { name: /^Editor$/i, level: 1 })).toBeVisible()
    })
    expect(reqs.some((r) => /\/api\/generations/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('"Save version" button is interactive', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/editor/${id}`)
    const btn = page.getByRole('button', { name: /Save version/i })
    await expect(btn).toBeEnabled()
    await btn.click()
  })

  test('Inpaint tool toggles pressed', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/editor/${id}`)
    const btn = page.getByRole('button', { name: /^Inpaint$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Outpaint tool toggles pressed', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/editor/${id}`)
    const btn = page.getByRole('button', { name: /^Outpaint$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Erase tool toggles pressed', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/editor/${id}`)
    const btn = page.getByRole('button', { name: /^Erase$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Crop tool toggles pressed', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/editor/${id}`)
    const btn = page.getByRole('button', { name: /^Crop$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Add layer" appends a layer to the layer list', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/editor/${id}`)
    const layers = page.locator('article:has(:text("Layers")) li')
    const before = await layers.count()
    await page.getByRole('button', { name: /Add layer/i }).click()
    await page.waitForTimeout(200)
    const after = await layers.count()
    expect(after).toBeGreaterThan(before)
  })
})

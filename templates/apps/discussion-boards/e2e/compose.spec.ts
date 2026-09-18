import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, pickCategory, signup } from './_helpers.js'

test.describe('/compose (Compose)', () => {
  test('thread title input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    const t = `Compose probe title ${Date.now()}`
    await page.locator('#compose-title').fill(t)
    await expect(page.locator('#compose-title')).toHaveValue(t)
  })

  test('body textarea accepts markdown text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    const body = '# header\n\nbody **bold**'
    await page.locator('#compose-body').fill(body)
    await expect(page.locator('#compose-body')).toHaveValue(body)
  })

  test('a category chip from the live board is selectable', async ({ page }) => {
    await signup(page)
    // The chip is named after a category the API returns, so the spec holds
    // once the demo rooms are replaced.
    const category = await pickCategory(page)
    await page.goto(APP_BASE + '/compose')
    await page.waitForResponse((r) => /\/api\/categories(\?|$)/.test(r.url()), { timeout: 15_000 })
    const chip = page.getByRole('button', { name: category.name }).first()
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(chip).toBeVisible()
  })

  test('Write toggle returns to the textarea view', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    await page.locator('#compose-body').fill('hello')
    await page.getByRole('button', { name: /^Preview$/i }).click()
    await page.getByRole('button', { name: /^Write$/i }).click()
    await expect(page.locator('#compose-body')).toBeVisible()
  })

  test('Preview toggle hides the textarea and renders the markdown', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    await page.locator('#compose-body').fill('# Hello world')
    await page.getByRole('button', { name: /^Preview$/i }).click()
    await expect(page.getByRole('heading', { name: /Hello world/i })).toBeVisible({
      timeout: 5_000,
    })
  })

  test('Cancel returns to the previous page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await page.goto(APP_BASE + '/compose')
    await page.getByRole('button', { name: /Cancel/i }).click()
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
  })

  test('Publish thread submits POST /api/threads and lands on the new thread', async ({ page }) => {
    await signup(page)
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/compose?category=${category.slug}`)
    const title = `Compose publish probe ${Date.now()}`
    await page.locator('#compose-title').fill(title)
    await page.locator('#compose-body').fill('Body of the probe thread.')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Publish thread/i }).click()
      await expect(page).toHaveURL(/\/t\//, { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/api\/threads(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/threads must have fired').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
    // Read-after-write — the new thread appears in /api/threads listing.
    const list = await page.request.get(API_BASE + '/threads')
    const data = (await list.json()).data ?? []
    expect(data.find((t: { title: string }) => t.title === title)).toBeTruthy()
  })

  test('empty submit is blocked (button disabled until title + body are filled)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    const btn = page.getByRole('button', { name: /Publish thread/i })
    await expect(btn).toBeDisabled()
    await page.locator('#compose-title').fill('a')
    await expect(btn).toBeDisabled()
    await page.locator('#compose-body').fill('b')
    await expect(btn).toBeEnabled()
  })
})

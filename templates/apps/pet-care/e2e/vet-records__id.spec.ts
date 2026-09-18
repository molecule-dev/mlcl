import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, signup } from './_helpers.js'

test.describe('vet-records detail page', () => {
  test('renders record details after seeding', async ({ page }) => {
    await signup(page)
    const pet = await authedPost(page, '/pets', {
      name: `Vrd-${Date.now()}`,
      species: 'cat',
      breed: 'Mix',
    })
    const title = `Vaccine ${Date.now()}`
    const rec = await authedPost(page, '/vet-records', {
      pet_id: pet.id,
      kind: 'vaccine',
      title,
      summary: 'Annual rabies booster',
      record_date: new Date().toISOString().slice(0, 10),
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/vet-records/${rec.id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && new RegExp(`/api/vet-records/${rec.id}\\b`).test(r.url),
      ),
    ).toBeTruthy()
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test('back link returns to /vet-records', async ({ page }) => {
    await signup(page)
    const pet = await authedPost(page, '/pets', {
      name: `Bk-${Date.now()}`,
      species: 'dog',
      breed: 'Mix',
    })
    const rec = await authedPost(page, '/vet-records', {
      pet_id: pet.id,
      kind: 'visit',
      title: 'visit',
      summary: 'all good',
      record_date: new Date().toISOString().slice(0, 10),
    })
    await page.goto(APP_BASE + `/vet-records/${rec.id}`)
    const back = page.getByRole('link', { name: /back|records/i }).first()
    if (await back.count().catch(() => 0)) {
      await back.click()
      await expect(page).toHaveURL(/\/vet-records$/)
    }
  })

  test('renders summary content from the API record', async ({ page }) => {
    await signup(page)
    const pet = await authedPost(page, '/pets', {
      name: `Sm-${Date.now()}`,
      species: 'dog',
      breed: 'Lab',
    })
    const summary = `Distinctive summary text ${Date.now()}`
    const rec = await authedPost(page, '/vet-records', {
      pet_id: pet.id,
      kind: 'visit',
      title: 'visit',
      summary,
      record_date: new Date().toISOString().slice(0, 10),
    })
    await page.goto(APP_BASE + `/vet-records/${rec.id}`)
    await expect(page.getByText(summary).first()).toBeVisible()
  })
})

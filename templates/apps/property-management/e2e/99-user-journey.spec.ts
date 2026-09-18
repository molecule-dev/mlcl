import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, authedPost, authedGet } from './_helpers.js'

interface Resource {
  id: string
}

// Cross-page user journey: sign up → seed property + tenant + unit + lease + maintenance,
// then walk every primary route and confirm it renders.
test('full user journey across the app', async ({ page }) => {
  await signup(page)

  const property = await authedPost<Resource>(page, '/properties', {
    name: `Journey Property ${Date.now()}`,
    address: '999 Journey Way',
    city: 'Testville',
  })

  const unit = await authedPost<Resource>(page, '/units', {
    property_id: property.id,
    unit_number: 'J1',
    name: 'Unit J1',
    bedrooms: 1,
    bathrooms: 1,
    monthly_rent_cents: 150000,
  })

  const tenant = await authedPost<Resource>(page, '/tenants', {
    name: 'Journey Tenant',
    email: 'jt@example.com',
    property_id: property.id,
    unit_id: unit.id,
  })

  await authedPost<Resource>(page, '/leases', {
    tenant_id: tenant.id,
    unit_id: unit.id,
    property_id: property.id,
    start_date: new Date().toISOString().slice(0, 10),
    monthly_rent_cents: 150000,
    deposit_cents: 150000,
    status: 'active',
  })

  await authedPost<Resource>(page, '/maintenance', {
    title: 'Fix leak',
    priority: 'medium',
    property_id: property.id,
    unit_id: unit.id,
    tenant_id: tenant.id,
  })

  for (const path of [
    '/dashboard',
    '/properties',
    '/tenants',
    '/leases',
    '/maintenance',
    '/finances',
    '/reports',
    '/notifications',
    '/settings',
  ]) {
    await page.goto(APP_BASE + path)
    await expect(page.locator('h1, h2, h3, button, input').first()).toBeVisible({ timeout: 15000 })
  }

  // dashboard reflects what we seeded — at minimum the unit and lease are non-zero.
  const overview = await authedGet<{
    total_units: number
    occupied_units: number
    open_maintenance_count: number
  }>(page, '/dashboard/overview')
  expect(overview.total_units).toBeGreaterThanOrEqual(1)
  expect(overview.occupied_units).toBeGreaterThanOrEqual(1)
  expect(overview.open_maintenance_count).toBeGreaterThanOrEqual(1)
})

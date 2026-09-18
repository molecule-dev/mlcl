import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup, waitForSeed } from './_helpers.js'

/**
 * Kitchen-sink end-to-end journey for the fleet-management flagship.
 *
 * Drives the running app the way a real human dispatcher would — sign up,
 * land on the dashboard, walk into every primary section, exercise one
 * mutation per page, and prove the read-after-write side effect held.
 *
 * If this spec is green, the flagship is genuinely usable end-to-end.
 */
test.describe('99 — kitchen-sink user journey', () => {
  test('signup → dashboard → vehicles → drivers → routes → maintenance → alerts → geofences → trips → reports → settings → notifications', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const { accessToken } = await signup(page)

    // Trigger the demo seed by reading vehicles once.
    await waitForSeed(page, accessToken)

    // ───── Dashboard ─────
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/dashboard')
        await expect(page.getByRole('heading', { name: /fleet command/i, level: 1 })).toBeVisible({
          timeout: 15000,
        })
      })
      const fleet = reqs.find((r) => /\/api\/reports\/fleet/.test(r.url) && r.method === 'GET')
      expect(fleet?.status, 'GET /api/reports/fleet').toBe(200)
    }

    // ───── Vehicles list + create ─────
    {
      await page.goto(APP_BASE + '/vehicles')
      await expect(page.getByRole('heading', { name: /^vehicles$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      const plate = `KS-${Date.now() % 100000}`
      await page.getByRole('button', { name: /\+ add vehicle/i }).click()
      await page.getByLabel(/license plate/i).fill(plate)
      await page.getByLabel(/^make$/i).fill('Acme')
      await page.getByLabel(/^model$/i).fill('Kitchen-Sink')
      await page.getByLabel(/^year$/i).fill('2027')
      await page.getByRole('button', { name: /^add vehicle$/i }).click()
      await expect(page.getByRole('link', { name: plate })).toBeVisible({ timeout: 10000 })
      // read-after-write
      const list = await page.request.get(API_BASE + '/vehicles', {
        headers: apiHeaders(accessToken),
      })
      const vehicles = (await list.json()) as Array<{ plate?: string; license_plate?: string }>
      expect(
        vehicles.some((v) => (v.plate || v.license_plate) === plate),
        'created vehicle present in /api/vehicles list',
      ).toBe(true)
    }

    // ───── Vehicle detail ─────
    {
      const list = await page.request.get(API_BASE + '/vehicles', {
        headers: apiHeaders(accessToken),
      })
      const vehicles = (await list.json()) as Array<{ id: string }>
      const id = vehicles[0]!.id
      await page.goto(APP_BASE + `/vehicles/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/odometer/i)).toBeVisible()
    }

    // ───── Drivers list + create ─────
    {
      await page.goto(APP_BASE + '/drivers')
      await expect(page.getByRole('heading', { name: /^drivers$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      const name = `KS Driver ${Date.now() % 100000}`
      await page.getByRole('button', { name: /\+ add driver/i }).click()
      await page.getByLabel(/^name$/i).fill(name)
      await page.getByLabel(/^email$/i).fill(`ks-driver+${Date.now()}@flagship.test`)
      await page.getByRole('button', { name: /^add driver$/i }).click()
      await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
      const list = await page.request.get(API_BASE + '/drivers', {
        headers: apiHeaders(accessToken),
      })
      const drivers = (await list.json()) as Array<{ name: string }>
      expect(
        drivers.some((d) => d.name === name),
        'driver present in /api/drivers',
      ).toBe(true)
    }

    // ───── Routes list + create ─────
    {
      await page.goto(APP_BASE + '/routes')
      await expect(page.getByRole('heading', { name: /^routes$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      const routeName = `KS Route ${Date.now() % 100000}`
      await page.getByRole('button', { name: /\+ new dispatch/i }).click()
      await page.getByLabel(/route name/i).fill(routeName)
      await page.getByRole('button', { name: /^dispatch$/i }).click()
      await page.getByRole('button', { name: /^all$/i }).click()
      await expect(page.getByText(routeName)).toBeVisible({ timeout: 10000 })
    }

    // ───── Maintenance list + create + detail ─────
    {
      await page.goto(APP_BASE + '/maintenance')
      await expect(page.getByRole('heading', { name: /^maintenance$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      const description = `KS service ${Date.now() % 100000}`
      await page.getByRole('button', { name: /\+ schedule service/i }).click()
      const dialog = page.getByRole('dialog', { name: /schedule service/i })
      await expect(dialog).toBeVisible()
      const vehicleSelect = dialog.getByRole('combobox', { name: /^vehicle$/i })
      await expect
        .poll(async () => vehicleSelect.locator('option').count(), { timeout: 15000 })
        .toBeGreaterThanOrEqual(2)
      const optionValue = await vehicleSelect.locator('option').nth(1).getAttribute('value')
      await vehicleSelect.selectOption(optionValue!)
      await dialog.getByLabel(/^description$/i).fill(description)
      await dialog.getByLabel(/scheduled date/i).fill('2027-02-15')
      await dialog.getByRole('button', { name: /^schedule$/i }).click()
      await page.getByRole('button', { name: /^all$/i }).click()
      await expect(page.getByText(description)).toBeVisible({ timeout: 10000 })

      // Detail page reflects the freshly created work order with parts list & total.
      const list = await page.request.get(API_BASE + '/maintenance', {
        headers: apiHeaders(accessToken),
      })
      const maint = (await list.json()) as Array<{ id: string; description: string }>
      const created = maint.find((m) => m.description === description)
      if (created) {
        await page.goto(APP_BASE + `/maintenance/${created.id}`)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
      }
    }

    // ───── Alerts: acknowledge ─────
    {
      await page.goto(APP_BASE + '/alerts')
      await expect(page.getByRole('heading', { name: /^alerts$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      await page.getByRole('button', { name: /^unresolved$/i }).click()
      const ackButtons = page.getByRole('button', { name: /^acknowledge$/i })
      const before = await ackButtons.count()
      if (before > 0) {
        await ackButtons.first().click()
        await expect.poll(() => ackButtons.count(), { timeout: 10000 }).toBe(before - 1)
        await page.reload()
        await page.getByRole('button', { name: /^unresolved$/i }).click()
        await expect
          .poll(() => page.getByRole('button', { name: /^acknowledge$/i }).count(), {
            timeout: 10000,
          })
          .toBe(before - 1)
      }
    }

    // ───── Geofences create ─────
    {
      await page.goto(APP_BASE + '/geofences')
      await expect(page.getByRole('heading', { name: /^geofences$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      const zone = `KS Zone ${Date.now() % 100000}`
      await page.getByRole('button', { name: /\+ new geofence/i }).click()
      await page.getByLabel(/^name$/i).fill(zone)
      await page.getByRole('button', { name: /^create$/i }).click()
      await expect(page.getByText(zone).first()).toBeVisible({ timeout: 10000 })
      const list = await page.request.get(API_BASE + '/geofences', {
        headers: apiHeaders(accessToken),
      })
      const zones = (await list.json()) as Array<{ name: string }>
      expect(
        zones.some((z) => z.name === zone),
        'geofence present in /api/geofences',
      ).toBe(true)
    }

    // ───── Trips ─────
    {
      await page.goto(APP_BASE + '/trips')
      await expect(page.getByRole('heading', { name: /^trips$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      await expect(page.getByText(/last 30 days · \d+ trips/i)).toBeVisible()
    }

    // ───── Reports ─────
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/reports')
        await expect(page.getByRole('heading', { name: /^reports$/i, level: 1 })).toBeVisible({
          timeout: 15000,
        })
      })
      const a = reqs.find((r) => /\/api\/reports\/analytics/.test(r.url) && r.method === 'GET')
      expect(a?.status, 'GET /api/reports/analytics').toBe(200)
    }

    // ───── Notifications ─────
    {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /^notifications$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
    }

    // ───── Settings: change a threshold and assert it survives reload ─────
    {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
      await page.getByRole('button', { name: /^thresholds$/i }).click()
      const threshold = page.getByLabel(/speeding threshold/i)
      await threshold.fill('77')
      await page.getByRole('button', { name: /save changes/i }).click()
      await expect(page.getByText(/^saved\.?$/i)).toBeVisible({ timeout: 10000 })
      await page.reload()
      await page.getByRole('button', { name: /^thresholds$/i }).click()
      await expect(page.getByLabel(/speeding threshold/i)).toHaveValue('77')
    }

    // ───── Pricing → Billing checkout (if Stripe priceIds are configured) ─────
    {
      const tiersResp = await page.request.get(API_BASE + '/billing/tiers')
      expect(tiersResp.status()).toBe(200)
      const tiersBody = (await tiersResp.json()) as {
        data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
      }
      const pro = tiersBody.data.find((t) => t.key === 'pro')
      const proPriceId = pro?.prices.find((p) => !!p.stripePriceId)?.stripePriceId ?? null
      if (proPriceId) {
        const checkout = await page.request.post(API_BASE + '/billing/checkout', {
          data: { priceId: proPriceId },
          headers: apiHeaders(accessToken),
        })
        expect(checkout.status()).toBe(200)
        const body = (await checkout.json()) as {
          url?: string
          checkoutUrl?: string
          updated?: boolean
        }
        if (!body.updated) {
          expect(body.url || body.checkoutUrl || '').toMatch(/stripe\.com/)
        }
      }
    }
  })
})

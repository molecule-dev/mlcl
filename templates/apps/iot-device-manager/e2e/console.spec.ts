import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createDeviceApi, listCommands, signup } from './_helpers.js'

test.describe('Console — live command terminal', () => {
  test('Empty fleet: terminal renders, "register a device" hint shown, input disabled', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/console')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByText(/register a device to begin/i)).toBeVisible()
    const input = page.getByPlaceholder(/send <command_type>/i)
    await expect(input).toBeDisabled()
  })

  test('`reboot` command POSTs /api/commands and the device-scoped log lists it', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'Console-Tgt',
      device_type: 'gateway',
    })
    await page.goto(APP_BASE + '/console')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const input = page.getByPlaceholder(/send <command_type>/i)
    await expect(input).toBeEnabled()
    const reqs = await captureNetwork(page, async () => {
      await input.fill('reboot')
      await input.press('Enter')
      await expect(page.getByText(/command queued/i)).toBeVisible({ timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/commands(\?|$)/.test(r.url))
    expect(post, 'expected POST /api/commands').toBeTruthy()
    expect(post!.status).toBe(201)

    // Read-after-write: the reboot command exists for this device.
    const cmds = await listCommands(page, accessToken, dev.id)
    expect(
      cmds.find((c) => c.command_type === 'reboot'),
      'reboot row should exist',
    ).toBeTruthy()
  })

  test('`send <type> {json}` accepts JSON payload; `log` tails recent commands', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, { name: 'TailMe', device_type: 'sensor' })
    await page.goto(APP_BASE + '/console')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const input = page.getByPlaceholder(/send <command_type>/i)
    await input.fill('send config_refresh {"target":"primary"}')
    await input.press('Enter')
    await expect(page.getByText(/command queued/i)).toBeVisible({ timeout: 10000 })

    // tail
    await input.fill('log')
    await input.press('Enter')
    await expect(page.getByText(/Last 1 commands/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/config_refresh/i).first()).toBeVisible()

    const cmds = await listCommands(page, accessToken, dev.id)
    const refresh = cmds.find((c) => c.command_type === 'config_refresh')
    expect(refresh).toBeTruthy()
    const payload =
      typeof refresh!.payload === 'string'
        ? JSON.parse(refresh!.payload as string)
        : refresh!.payload
    expect((payload as { target?: string }).target).toBe('primary')
  })

  test('Invalid JSON payload prints an error and does NOT POST', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDeviceApi(page, accessToken, { name: 'BadInput', device_type: 'sensor' })
    await page.goto(APP_BASE + '/console')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const input = page.getByPlaceholder(/send <command_type>/i)
    const reqs = await captureNetwork(page, async () => {
      await input.fill('send diagnostics {nope}')
      await input.press('Enter')
      await page.waitForTimeout(400)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/commands(\?|$)/.test(r.url))
    expect(post, 'no POST on invalid JSON').toBeFalsy()
    await expect(page.getByText(/Invalid JSON payload/i)).toBeVisible()
  })

  test('`help` lists all commands; `clear` empties the terminal', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createDeviceApi(page, accessToken, { name: 'HelpDevice', device_type: 'sensor' })
    await page.goto(APP_BASE + '/console')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const input = page.getByPlaceholder(/send <command_type>/i)
    await input.fill('help')
    await input.press('Enter')
    await expect(page.getByText(/^Available commands:$/)).toBeVisible()
    await expect(page.getByText(/Show this list/i)).toBeVisible()

    await input.fill('clear')
    await input.press('Enter')
    await expect(page.getByText(/^Available commands:$/)).toHaveCount(0, { timeout: 5000 })
  })
})

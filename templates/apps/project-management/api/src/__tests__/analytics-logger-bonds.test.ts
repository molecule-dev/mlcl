import { describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-analytics'
import { setLogger } from '@molecule/api-logger'

vi.mock('@molecule/api-analytics', () => ({
  setProvider: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  setLogger: vi.fn(),
}))

vi.mock('@molecule/api-logger-console', () => ({
  provider: { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('analytics noop bond', () => {
  it('registers analytics provider', async () => {
    const { setupAnalyticsNoop } = await import('../bonds/analytics-noop.js')
    setupAnalyticsNoop()
    expect(setProvider).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setProvider).mock.calls[0][0] as {
      identify: () => Promise<void>
      track: () => Promise<void>
      page: () => Promise<void>
    }
    await expect(arg.identify()).resolves.toBeUndefined()
    await expect(arg.track()).resolves.toBeUndefined()
    await expect(arg.page()).resolves.toBeUndefined()
  })
})

describe('logger console bond', () => {
  it('bonds console logger', async () => {
    const { setupLoggerConsole } = await import('../bonds/logger-console.js')
    setupLoggerConsole()
    expect(setLogger).toHaveBeenCalledTimes(1)
  })
})

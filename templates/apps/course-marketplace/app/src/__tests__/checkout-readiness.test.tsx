// @vitest-environment jsdom
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))
vi.mock('@molecule/app-analytics', () => ({ track: vi.fn() }))
vi.mock('../components/Header.js', () => ({ Header: () => null }))
vi.mock('../components/Footer.js', () => ({ Footer: () => null }))
vi.mock('../lib/api.js', () => ({ api: request }))

import { Checkout } from '../pages/Checkout.js'
import { host, mount } from './route-test-utils.js'

function pending<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

beforeEach(() => vi.resetAllMocks())

describe('checkout record readiness', () => {
  it('keeps verification status outside the payment record until the server answers', async () => {
    const payment = pending<unknown>()
    request.mockReturnValueOnce(payment.promise)
    await mount(<Checkout />, '/checkout?session_id=checkout-123')
    expect(host.querySelector('[data-mol-id=checkout-loading]')?.textContent).toContain('Verifying')
    expect(host.querySelector('[data-mol-id=checkout-result]')).toBeNull()
    await act(async () =>
      payment.resolve({
        sessionId: 'checkout-123',
        paymentStatus: 'paid',
        amountTotal: 2500,
        courseId: null,
        enrollmentId: 'enrollment-1',
      }),
    )
    expect(host.querySelector('[data-mol-id=checkout-loading]')).toBeNull()
    expect(host.querySelector('[data-mol-id=checkout-result]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id=checkout-payment-status]')).not.toBeNull()
    expect(host.textContent).toContain('You’re enrolled!')
    expect(host.querySelector('[data-mol-id=checkout-go-learning]')?.getAttribute('href')).toBe(
      '/my-learning',
    )
  })

  it('keeps a verification failure distinct from saved payment fields', async () => {
    const payment = pending<unknown>()
    request.mockReturnValueOnce(payment.promise)
    await mount(<Checkout />, '/checkout?session_id=checkout-123')
    await act(async () => payment.reject(new Error('Provider unavailable')))
    expect(host.querySelector('[data-mol-id=checkout-loading]')).toBeNull()
    expect(host.querySelector('[data-mol-id=checkout-error]')?.textContent).toBe(
      'Provider unavailable',
    )
    expect(host.querySelector('[data-mol-id=checkout-payment-status]')).toBeNull()
  })

  it('does not request a payment for the empty or canceled route', async () => {
    await mount(<Checkout />, '/checkout')
    expect(host.querySelector('[data-mol-id=checkout-empty]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id=checkout-result]')).toBeNull()
    await mount(<Checkout />, '/checkout?canceled=1')
    expect(host.querySelector('[data-mol-id=checkout-canceled]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id=checkout-result]')).toBeNull()
    expect(request).not.toHaveBeenCalled()
  })
})

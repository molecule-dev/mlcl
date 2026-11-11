// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MoleculeReact from '@molecule/app-react'

import { BoardVisibilityButton } from '../../../templates/apps/whiteboard/app/src/components/BoardVisibilityButton.js'

const mocks = vi.hoisted(() => ({ put: vi.fn(), track: vi.fn() }))
vi.mock('@molecule/app-analytics', () => ({ track: mocks.track }))
vi.mock('@molecule/app-react', async (original) => ({
  ...(await original<typeof MoleculeReact>()),
  useHttpClient: () => ({ put: mocks.put }),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, options: { defaultValue: string }) => options.defaultValue,
  }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...values: string[]) => values.join(' '),
    flex: () => '',
    sp: () => '',
    fontWeight: () => '',
    textSize: () => '',
  }),
}))
afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())
const board = { id: 'board-alpha', is_public: false, public_slug: null }
type Props = Parameters<typeof BoardVisibilityButton>[0]
const props = (): Props => ({
  board,
  onConfirmed: vi.fn<Props['onConfirmed']>(),
  onError: vi.fn<Props['onError']>(),
})
const button = (): HTMLButtonElement => screen.getByRole('button') as HTMLButtonElement

describe('the shipped whiteboard visibility control', () => {
  it('shows the chosen label and pressed state while the save is still pending', () => {
    mocks.put.mockReturnValue(new Promise(() => {}))
    render(createElement(BoardVisibilityButton, props()))
    fireEvent.click(button())
    expect(button().textContent).toContain('Public')
    expect(button().getAttribute('aria-pressed')).toBe('true')
    expect(mocks.put).toHaveBeenCalledWith('/api/boards/board-alpha', {
      is_public: true,
      public_slug: 'b-board-al',
    })
  })
  it('accepts the second click before the first response and saves the newest choice in order', async () => {
    let finish!: (value: { data: { is_public: boolean; public_slug: string | null } }) => void
    mocks.put
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      .mockResolvedValueOnce({ data: { is_public: false, public_slug: null } })
    const p = props()
    render(createElement(BoardVisibilityButton, p))
    fireEvent.click(button())
    fireEvent.click(button())
    expect(button().textContent).toContain('Private')
    expect(mocks.put).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish({ data: { is_public: true, public_slug: 'b-board-al' } })
      await Promise.resolve()
    })
    expect(mocks.put).toHaveBeenNthCalledWith(2, '/api/boards/board-alpha', {
      is_public: false,
      public_slug: null,
    })
    expect(button().getAttribute('aria-pressed')).toBe('false')
    expect(p.onConfirmed).toHaveBeenLastCalledWith({ is_public: false, public_slug: null })
  })
  it('keeps pending intent when the parent renders an unchanged server snapshot', () => {
    mocks.put.mockReturnValue(new Promise(() => {}))
    const p = props(),
      view = render(createElement(BoardVisibilityButton, p))
    fireEvent.click(button())
    view.rerender(createElement(BoardVisibilityButton, { ...p, board: { ...board } }))
    expect(button().textContent).toContain('Public')
  })
  it('rolls back a failed save and reports the error', async () => {
    mocks.put.mockRejectedValue(new Error('offline'))
    const p = props()
    render(createElement(BoardVisibilityButton, p))
    await act(async () => {
      fireEvent.click(button())
      await Promise.resolve()
    })
    expect(button().textContent).toContain('Private')
    expect(p.onError).toHaveBeenCalledWith('offline')
    expect(p.onConfirmed).not.toHaveBeenCalled()
  })
  it('keeps another keyed board independent from the previous board’s pending save', () => {
    mocks.put.mockReturnValue(new Promise(() => {}))
    const p = props(),
      view = render(createElement(BoardVisibilityButton, { ...p, key: board.id }))
    fireEvent.click(button())
    view.rerender(
      createElement(BoardVisibilityButton, {
        ...p,
        key: 'other',
        board: { ...board, id: 'other' },
      }),
    )
    expect(button().textContent).toContain('Private')
    expect(mocks.put).toHaveBeenCalledTimes(1)
  })
})

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach } from 'vitest'

import { RouterProvider } from '@molecule/app-routing-react-router'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
export let host: HTMLDivElement
export let router: ReturnType<typeof createMemoryRouter>

beforeEach(() => {
  setClassMap(classMap)
  host = document.createElement('div')
  document.body.append(host)
})
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  router?.dispose()
  host.remove()
})

export async function mount(element: ReactNode, initial: string, path = '*'): Promise<void> {
  await act(async () => root?.unmount())
  router?.dispose()
  router = createMemoryRouter(
    [
      { path: '/login', element: <p>Sign in</p> },
      { path, element },
    ],
    { initialEntries: [initial] },
  )
  root = createRoot(host)
  await act(async () => root!.render(<RouterProvider router={router} />))
}
export function url(): string {
  const { pathname, search, hash } = router.state.location
  return pathname + search + hash
}
export async function go(to: string | number): Promise<void> {
  await act(async () => {
    if (typeof to === 'number') await router.navigate(to)
    else await router.navigate(to)
  })
}
export async function click(selector: string): Promise<void> {
  const target = host.querySelector<HTMLElement>(selector)
  if (!target) throw new Error('Missing control: ' + selector)
  await act(async () => target.click())
}
export async function clickText(text: string): Promise<void> {
  const target = [...host.querySelectorAll('button, a')].find((el) =>
    el.textContent?.includes(text),
  )
  if (!(target instanceof HTMLElement)) throw new Error('Missing control: ' + text)
  await act(async () => target.click())
}
export async function change(selector: string, value: string): Promise<void> {
  const target = host.querySelector<HTMLInputElement | HTMLSelectElement>(selector)
  if (!target) throw new Error('Missing field: ' + selector)
  const prototype =
    target instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(target, value)
    target.dispatchEvent(
      new Event(target instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    )
  })
}
export async function render(element: ReactNode): Promise<void> {
  await act(async () => root!.render(<RouterProvider router={router} />))
  // A fresh route element updates hooks whose provider status changed without changing the URL.
  await act(async () => {
    router.routes[1].element = element
    await router.navigate(url(), { replace: true })
  })
}

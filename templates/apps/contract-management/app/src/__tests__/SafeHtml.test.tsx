// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SafeHtml } from '../components/SafeHtml.js'

/**
 * Stored-XSS regression test (SEC4).
 *
 * Contract/template bodies are authored by one user and rendered to others
 * (including counterparties on the signing view). Before this fix the body
 * HTML was dropped straight into the DOM with `dangerouslySetInnerHTML`, so a
 * malicious `body_html` executed in viewers' browsers. `SafeHtml` (DOMPurify)
 * must strip every script vector while keeping benign formatting. These
 * assertions render real DOM in jsdom — an API-only test would not have caught
 * the render-side hole that shipped.
 */
describe('SafeHtml (XSS render guard)', () => {
  afterEach(cleanup)

  it('renders benign formatting markup intact', () => {
    const { container } = render(
      <SafeHtml html={'<h2 id="intro">Title</h2><p>Hello <strong>world</strong></p>'} />,
    )
    expect(container.querySelector('h2')?.textContent).toBe('Title')
    expect(container.querySelector('h2')?.getAttribute('id')).toBe('intro')
    expect(container.querySelector('strong')?.textContent).toBe('world')
  })

  it('strips <script> tags from authored HTML', () => {
    const { container } = render(
      <SafeHtml html={'<p>safe</p><script>window.__pwned = true</script>'} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('__pwned')
    expect(container.querySelector('p')?.textContent).toBe('safe')
  })

  it('strips inline event-handler attributes (onerror)', () => {
    const { container } = render(
      <SafeHtml html={'<img src="x" onerror="window.__pwned = true">'} />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('onerror')).toBeNull()
    expect(container.innerHTML.toLowerCase()).not.toContain('onerror')
  })

  it('strips <iframe> embeds', () => {
    const { container } = render(
      <SafeHtml html={'<iframe src="https://evil.example/phish"></iframe><p>body</p>'} />,
    )
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('body')
  })

  it('neutralizes javascript: URLs in links', () => {
    const { container } = render(
      <SafeHtml html={'<a href="javascript:window.__pwned=true">click</a>'} />,
    )
    const href = container.querySelector('a')?.getAttribute('href') ?? ''
    expect(href.toLowerCase()).not.toContain('javascript:')
  })

  it('renders nothing dangerous for a combined payload', () => {
    const payload =
      '<img src=x onerror="alert(1)"><svg onload="alert(2)"></svg><script>alert(3)</script>'
    const { container } = render(<SafeHtml html={payload} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML.toLowerCase()).not.toContain('onerror')
    expect(container.innerHTML.toLowerCase()).not.toContain('onload')
  })
})

import { describe, expect, it } from 'vitest'

import { APP_NAME } from '../branding.js'
import { getStaticPaths, render } from '../entry-server.js'

/**
 * The build writes each STATIC_PATHS page through `render`, in Node, under the routing bond's
 * StaticRouter. A page that renders in the browser can still fail here (a `window` read, a hook
 * that needs a router the build entry does not mount), and then `npm run build` fails, not dev.
 */
describe('static rendering', () => {
  it('renders every path the build writes', () => {
    for (const path of getStaticPaths()) {
      const page = render(path)
      expect(page.html, path).toContain('data-mol-id=')
      expect(page.title, path).toContain(APP_NAME)
    }
  })

  it('writes the home and about pages, and the not-found page for any other path', () => {
    expect(render('/').html).toContain('data-mol-id="home-page"')
    expect(render('/about/').html).toContain('data-mol-id="about-page"')
    expect(render('/no-such-page/').html).toContain('data-mol-id="not-found-page"')
  })
})

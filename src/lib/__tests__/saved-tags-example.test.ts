import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import * as example from '../../../templates/.agents/skills/examples/forms/tags-input/app/components/TagsInput.js'

describe('the copyable tags example', () => {
  beforeEach(() => setClassMap(classMap))

  it('displays the saved record labels in order in a read-only list', () => {
    expect(typeof example.SavedTags).toBe('function')
    const record = { labels: ['urgent', 'needs review'] }
    const view = renderToStaticMarkup(
      createElement(example.SavedTags, {
        value: record.labels,
        'aria-label': 'Saved labels',
        renderTag: (label) =>
          createElement('a', { href: `/labels/${encodeURIComponent(label)}` }, label),
      }),
    )
    expect(view).toContain('aria-label="Saved labels"')
    expect(view.match(/<li>/g)).toHaveLength(2)
    expect(view).toContain('<a href="/labels/urgent">urgent</a>')
    expect(view).toContain('<a href="/labels/needs%20review">needs review</a>')
    expect(view.indexOf('urgent')).toBeLessThan(view.indexOf('needs review'))
    expect(view).not.toMatch(/<(input|button)\b/)
  })

  it('shows no tags section after saving the last label removal', () => {
    expect(typeof example.SavedTags).toBe('function')
    expect(renderToStaticMarkup(createElement(example.SavedTags, { value: [] }))).toBe('')
  })
})

import { describe, expect, it } from 'vitest'

import { isPostVisibleToViewer } from '../lib/visibility.js'

// The /saved bookmarks read fetched posts by id with NO visibility filter, unlike every other post
// read — so a followers/private post the viewer had bookmarked leaked back. isPostVisibleToViewer is
// the shared gate that read now applies in JS.
const VIEWER = 'viewer-1'
const followed = new Set(['author-followed'])

describe('isPostVisibleToViewer', () => {
  it('shows public posts to anyone', () => {
    expect(
      isPostVisibleToViewer({ user_id: 'someone', visibility: 'public' }, VIEWER, followed),
    ).toBe(true)
    // missing visibility defaults to public
    expect(isPostVisibleToViewer({ user_id: 'someone' }, VIEWER, followed)).toBe(true)
  })

  it('always shows the viewer their own posts, whatever the visibility', () => {
    expect(
      isPostVisibleToViewer({ user_id: VIEWER, visibility: 'private' }, VIEWER, followed),
    ).toBe(true)
    expect(
      isPostVisibleToViewer({ user_id: VIEWER, visibility: 'followers' }, VIEWER, followed),
    ).toBe(true)
  })

  it('shows a followers post only when the viewer follows the author', () => {
    expect(
      isPostVisibleToViewer(
        { user_id: 'author-followed', visibility: 'followers' },
        VIEWER,
        followed,
      ),
    ).toBe(true)
    expect(
      isPostVisibleToViewer(
        { user_id: 'author-not-followed', visibility: 'followers' },
        VIEWER,
        followed,
      ),
    ).toBe(false)
  })

  it('never shows another user’s private post', () => {
    expect(
      isPostVisibleToViewer(
        { user_id: 'author-followed', visibility: 'private' },
        VIEWER,
        followed,
      ),
    ).toBe(false)
  })
})

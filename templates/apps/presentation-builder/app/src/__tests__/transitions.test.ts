import { describe, expect, it } from 'vitest'

import { slideTransitionAnimation } from '../lib/transitions.js'

// Slides store a transition (fade/slide/zoom/flip/none) set in the Editor, but the Present view
// never applied it. slideTransitionAnimation maps the stored value to the CSS animation shorthand.

describe('slideTransitionAnimation', () => {
  it('maps each Editor transition to its keyframe animation', () => {
    expect(slideTransitionAnimation('fade')).toBe('present-fade 420ms ease-out')
    expect(slideTransitionAnimation('slide')).toBe('present-slide-in 420ms ease-out')
    expect(slideTransitionAnimation('zoom')).toBe('present-zoom 420ms ease-out')
    expect(slideTransitionAnimation('flip')).toBe('present-flip 420ms ease-out')
  })

  it('returns undefined for none / unset / unknown (no animation)', () => {
    expect(slideTransitionAnimation('none')).toBeUndefined()
    expect(slideTransitionAnimation(null)).toBeUndefined()
    expect(slideTransitionAnimation(undefined)).toBeUndefined()
    expect(slideTransitionAnimation('spin')).toBeUndefined()
  })
})

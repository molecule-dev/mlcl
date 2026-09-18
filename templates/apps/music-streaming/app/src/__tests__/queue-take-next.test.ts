import { describe, expect, it } from 'vitest'

import { takeNext } from '../lib/queue.js'

// The player persists + highlights is_shuffled but always advanced the queue in order (head), so
// shuffle did nothing. takeNext() picks a random item when shuffle is on; the head otherwise.

describe('takeNext', () => {
  it('takes the head in order when shuffle is off', () => {
    expect(takeNext(['a', 'b', 'c', 'd'], false)).toEqual({ next: 'a', rest: ['b', 'c', 'd'] })
  })

  it('picks a random item when shuffle is on (rng selects the index)', () => {
    // rng 0.99 * 4 → floor 3 → last item
    expect(takeNext(['a', 'b', 'c', 'd'], true, () => 0.99)).toEqual({
      next: 'd',
      rest: ['a', 'b', 'c'],
    })
    // rng 0.5 * 4 → floor 2 → 'c'; rest preserves order around the removed item
    expect(takeNext(['a', 'b', 'c', 'd'], true, () => 0.5)).toEqual({
      next: 'c',
      rest: ['a', 'b', 'd'],
    })
    // rng 0 → head
    expect(takeNext(['a', 'b', 'c', 'd'], true, () => 0)).toEqual({
      next: 'a',
      rest: ['b', 'c', 'd'],
    })
  })

  it('returns no next for an empty queue', () => {
    expect(takeNext([], false)).toEqual({ next: undefined, rest: [] })
    expect(takeNext([], true, () => 0.5)).toEqual({ next: undefined, rest: [] })
  })

  it('never loses or duplicates tracks (rest = queue minus the picked, for any shuffle index)', () => {
    const q = ['a', 'b', 'c', 'd', 'e']
    for (const r of [0, 0.2, 0.45, 0.6, 0.99]) {
      const { next, rest } = takeNext(q, true, () => r)
      expect(rest).toHaveLength(q.length - 1)
      expect([...rest, next].sort()).toEqual([...q].sort())
    }
  })
})

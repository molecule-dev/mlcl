import { describe, expect, it } from 'vitest'

import {
  buildLifeTimeline,
  buildTreeLayout,
  deriveRelatives,
  type PersonRecord,
  planRelativeEdges,
  type RelationshipRecord,
  suggestRoot,
} from '../handlers/_graph.js'

let seq = 0
function person(overrides: Partial<PersonRecord> & { first_name: string }): PersonRecord {
  seq += 1
  return {
    id: overrides.id ?? `p${seq}`,
    first_name: overrides.first_name,
    last_name: overrides.last_name ?? null,
    maiden_name: overrides.maiden_name ?? null,
    gender: overrides.gender ?? null,
    birth_date: overrides.birth_date ?? null,
    birth_place: overrides.birth_place ?? null,
    death_date: overrides.death_date ?? null,
    death_place: overrides.death_place ?? null,
    notes: overrides.notes ?? null,
    photo_url: overrides.photo_url ?? null,
  }
}

function rel(from: string, to: string, kind: 'parent' | 'partner'): RelationshipRecord {
  seq += 1
  return { id: `r${seq}`, from_person: from, to_person: to, kind }
}

describe('deriveRelatives', () => {
  it('derives parents, partners, children, and siblings from stored edges', () => {
    const self = person({ id: 'self', first_name: 'Self', birth_date: '1990-01-01' })
    const dad = person({ id: 'dad', first_name: 'Dad', birth_date: '1960-01-01' })
    const mom = person({ id: 'mom', first_name: 'Mom', birth_date: '1962-01-01' })
    const spouse = person({ id: 'spouse', first_name: 'Spouse', birth_date: '1991-01-01' })
    const kid = person({ id: 'kid', first_name: 'Kid', birth_date: '2020-01-01' })
    const sibling = person({ id: 'sib', first_name: 'Sib', birth_date: '1992-01-01' })
    const unrelated = person({ id: 'other', first_name: 'Other' })

    const rels = [
      rel('self', 'dad', 'parent'),
      rel('self', 'mom', 'parent'),
      rel('sib', 'dad', 'parent'),
      rel('sib', 'mom', 'parent'),
      rel('self', 'spouse', 'partner'),
      rel('kid', 'self', 'parent'),
      rel('kid', 'spouse', 'parent'),
      rel('dad', 'mom', 'partner'),
    ]
    const r = deriveRelatives('self', [self, dad, mom, spouse, kid, sibling, unrelated], rels)

    expect(r.parents.map((p) => p.id)).toEqual(['dad', 'mom'])
    expect(r.partners.map((p) => p.id)).toEqual(['spouse'])
    expect(r.children.map((p) => p.id)).toEqual(['kid'])
    expect(r.siblings.map((p) => p.id)).toEqual(['sib'])
  })

  it('counts half-siblings (one shared parent) as siblings', () => {
    const self = person({ id: 'self', first_name: 'Self' })
    const dad = person({ id: 'dad', first_name: 'Dad' })
    const stepMom = person({ id: 'stepmom', first_name: 'Step' })
    const halfSib = person({ id: 'half', first_name: 'Half' })
    const rels = [
      rel('self', 'dad', 'parent'),
      rel('half', 'dad', 'parent'),
      rel('half', 'stepmom', 'parent'),
      rel('dad', 'stepmom', 'partner'),
    ]
    const r = deriveRelatives('self', [self, dad, stepMom, halfSib], rels)
    expect(r.siblings.map((p) => p.id)).toEqual(['half'])
  })

  it('returns empty relatives for a person with no edges', () => {
    const lone = person({ id: 'lone', first_name: 'Lone' })
    const r = deriveRelatives('lone', [lone], [])
    expect(r).toEqual({ parents: [], partners: [], children: [], siblings: [] })
  })
})

describe('planRelativeEdges (implicit-inverse creation)', () => {
  const rels = [
    rel('self', 'dad', 'parent'),
    rel('self', 'mom', 'parent'),
    rel('self', 'spouse', 'partner'),
  ]

  it('adding a parent stores child → new (both directions readable)', () => {
    expect(planRelativeEdges('new', 'self', 'parent', rels)).toEqual([
      { from_person: 'self', to_person: 'new', kind: 'parent' },
    ])
  })

  it('adding a child stores new → existing parent', () => {
    expect(planRelativeEdges('new', 'self', 'child', rels)).toEqual([
      { from_person: 'new', to_person: 'self', kind: 'parent' },
    ])
  })

  it('adding a partner stores one undirected edge', () => {
    expect(planRelativeEdges('new', 'self', 'partner', rels)).toEqual([
      { from_person: 'new', to_person: 'self', kind: 'partner' },
    ])
  })

  it('adding a sibling links the new person to every shared parent', () => {
    const edges = planRelativeEdges('new', 'self', 'sibling', rels)
    expect(edges).toHaveLength(2)
    expect(edges).toContainEqual({ from_person: 'new', to_person: 'dad', kind: 'parent' })
    expect(edges).toContainEqual({ from_person: 'new', to_person: 'mom', kind: 'parent' })
  })
})

describe('buildTreeLayout', () => {
  it('signature flow: self + parent + partner render as three connected cards', () => {
    const self = person({ id: 'self', first_name: 'Self', birth_date: '1994-01-01' })
    const parent = person({ id: 'parent', first_name: 'Parent', birth_date: '1965-01-01' })
    const partner = person({ id: 'partner', first_name: 'Partner', birth_date: '1995-01-01' })
    const rels = [rel('self', 'parent', 'parent'), rel('self', 'partner', 'partner')]

    const layout = buildTreeLayout('self', [self, parent, partner], rels)

    expect(layout.nodes).toHaveLength(3)
    const gen = new Map(layout.nodes.map((n) => [n.id, n.generation]))
    expect(gen.get('parent') as number).toBeLessThan(gen.get('self') as number)
    expect(gen.get('partner')).toBe(gen.get('self'))
    // Partner cards sit adjacent in the same row.
    const x = new Map(layout.nodes.map((n) => [n.id, n.x]))
    expect(Math.abs((x.get('self') as number) - (x.get('partner') as number))).toBe(1)
    // All three edges are present in the payload for connector drawing.
    expect(layout.edges).toHaveLength(2)
    expect(layout.stats).toEqual({ people: 3, generations: 2 })
  })

  it('normalizes generations so the eldest displayed generation is row 0', () => {
    const grand = person({ id: 'grand', first_name: 'Grand', birth_date: '1938-01-01' })
    const dad = person({ id: 'dad', first_name: 'Dad', birth_date: '1965-01-01' })
    const me = person({ id: 'me', first_name: 'Me', birth_date: '1994-01-01' })
    const rels = [rel('dad', 'grand', 'parent'), rel('me', 'dad', 'parent')]

    const layout = buildTreeLayout('me', [grand, dad, me], rels)
    const gen = new Map(layout.nodes.map((n) => [n.id, n.generation]))
    expect(gen.get('grand')).toBe(0)
    expect(gen.get('dad')).toBe(1)
    expect(gen.get('me')).toBe(2)
    expect(layout.stats.generations).toBe(3)
  })

  it('clusters siblings under their parents and marks the root', () => {
    const walter = person({ id: 'walter', first_name: 'Walter', birth_date: '1938-01-01' })
    const margaret = person({ id: 'margaret', first_name: 'Margaret', birth_date: '1941-01-01' })
    const david = person({ id: 'david', first_name: 'David', birth_date: '1965-01-01' })
    const susan = person({ id: 'susan', first_name: 'Susan', birth_date: '1968-01-01' })
    const rels = [
      rel('david', 'walter', 'parent'),
      rel('david', 'margaret', 'parent'),
      rel('susan', 'walter', 'parent'),
      rel('susan', 'margaret', 'parent'),
      rel('walter', 'margaret', 'partner'),
    ]

    const layout = buildTreeLayout('walter', [walter, margaret, david, susan], rels)
    const x = new Map(layout.nodes.map((n) => [n.id, n.x]))
    const gen = new Map(layout.nodes.map((n) => [n.id, n.generation]))
    expect(gen.get('david')).toBe(1)
    expect(gen.get('susan')).toBe(1)
    expect(Math.abs((x.get('david') as number) - (x.get('susan') as number))).toBe(1)
    const root = layout.nodes.find((n) => n.id === 'walter')
    expect(root?.isRoot).toBe(true)
    expect(layout.nodes.filter((n) => n.isRoot)).toHaveLength(1)
  })

  it('excludes disconnected people from the layout', () => {
    const self = person({ id: 'self', first_name: 'Self' })
    const stranger = person({ id: 'stranger', first_name: 'Stranger' })
    const layout = buildTreeLayout('self', [self, stranger], [])
    expect(layout.nodes.map((n) => n.id)).toEqual(['self'])
  })

  it('returns an empty layout for an unknown root', () => {
    const layout = buildTreeLayout('nope', [person({ first_name: 'Self' })], [])
    expect(layout.nodes).toEqual([])
    expect(layout.stats).toEqual({ people: 0, generations: 0 })
  })
})

describe('suggestRoot', () => {
  it('prefers a parentless person with the widest descendant reach', () => {
    const walter = person({ id: 'walter', first_name: 'Walter', birth_date: '1938-01-01' })
    const frank = person({ id: 'frank', first_name: 'Frank', birth_date: '1936-01-01' })
    const david = person({ id: 'david', first_name: 'David', birth_date: '1965-01-01' })
    const susan = person({ id: 'susan', first_name: 'Susan', birth_date: '1968-01-01' })
    const jordan = person({ id: 'jordan', first_name: 'Jordan', birth_date: '1994-01-01' })
    const ava = person({ id: 'ava', first_name: 'Ava', birth_date: '2022-01-01' })
    const rels = [
      rel('david', 'walter', 'parent'),
      rel('susan', 'walter', 'parent'),
      rel('jordan', 'david', 'parent'),
      rel('ava', 'jordan', 'parent'),
      rel('jordan', 'frank', 'parent'),
    ]
    expect(suggestRoot([walter, frank, david, susan, jordan, ava], rels)).toBe('walter')
  })

  it('falls back to the earliest-born person when everyone has parents recorded', () => {
    const a = person({ id: 'a', first_name: 'A', birth_date: '1900-01-01' })
    const b = person({ id: 'b', first_name: 'B', birth_date: '1910-01-01' })
    expect(suggestRoot([a, b], [rel('b', 'a', 'parent')])).toBe('a')
  })

  it('returns null for an empty tree', () => {
    expect(suggestRoot([], [])).toBeNull()
  })
})

describe('buildLifeTimeline', () => {
  it('orders life events chronologically with undated events last', () => {
    const self = person({
      id: 'self',
      first_name: 'Self',
      birth_date: '1965-01-01',
      birth_place: 'Portland, Maine',
      death_date: '2020-01-01',
      death_place: 'Boston',
    })
    const spouse = person({ id: 'spouse', first_name: 'Spouse' })
    const kid = person({ id: 'kid', first_name: 'Kid', birth_date: '1994-01-01' })
    const relatives = {
      parents: [],
      partners: [spouse],
      children: [kid],
      siblings: [],
    }

    const events = buildLifeTimeline(self, relatives)
    expect(events.map((e) => e.kind)).toEqual(['birth', 'child', 'death', 'partnership'])
    expect(events[0].detail).toBe('Portland, Maine')
    expect(events[1].detail).toBe('Kid')
    expect(events[2].detail).toBe('Boston')
  })
})

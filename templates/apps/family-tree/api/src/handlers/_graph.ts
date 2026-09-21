/**
 * family-tree — graph derivation + tree layout (the app's single source of
 * truth for family math).
 *
 * STORAGE MODEL (kept deliberately minimal):
 * - `people` rows are the nodes.
 * - `relationships` rows are the ONLY stored edges, with two kinds:
 *   - `parent`: directed — from_person's parent IS to_person (child → parent).
 *   - `partner`: undirected spousal edge, stored once.
 * Children and siblings are NEVER stored — they are derived here:
 * children = people whose parent-edge points at the person; siblings = people
 * sharing at least one parent edge target.
 *
 * Everything the handlers and tests need lives in this module:
 * - {@link deriveRelatives} — parents/partners/children/siblings for a person.
 * - {@link planRelativeEdges} — the implicit-inverse edge plan for
 *   "add X as <relation> of Y" (adding a parent links both directions).
 * - {@link buildTreeLayout} — deterministic generational layout (row +
 *   column slot per person) for the Tree screen.
 * - {@link buildLifeTimeline} — per-person life events derived from the graph.
 *
 * @module
 */

export type RelationKind = 'parent' | 'partner'

/** Relations a NEW person can be added as, relative to an existing person. */
export type RelativeRelation = 'parent' | 'partner' | 'child' | 'sibling'

export interface PersonRecord {
  id: string
  user_id?: string
  first_name: string
  last_name?: string | null
  maiden_name?: string | null
  gender?: string | null
  /** pg `date` columns come back as Date objects (local midnight) — normalize with {@link toDateStr}. */
  birth_date?: string | Date | null
  birth_place?: string | null
  death_date?: string | Date | null
  death_place?: string | null
  notes?: string | null
  photo_url?: string | null
  created_at?: string | Date | null
}

/**
 * Normalize a `date` column value to a YYYY-MM-DD string (or null).
 *
 * pg parses DATE columns into JS Date objects pinned to LOCAL midnight.
 * Left raw they (a) crash string APIs (`localeCompare`) and (b) serialize
 * via JSON to UTC — landing on the PREVIOUS calendar day for any
 * positive-offset timezone. Local getters return the original calendar
 * date, so the round-trip is lossless.
 */
export function toDateStr(v: string | Date | null | undefined): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'string') return v
  const y = v.getFullYear()
  const m = `${v.getMonth() + 1}`.padStart(2, '0')
  const d = `${v.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Copy of a person record with birth/death dates normalized to YYYY-MM-DD strings. */
export function normalizePerson<T extends PersonRecord>(p: T): T {
  return { ...p, birth_date: toDateStr(p.birth_date), death_date: toDateStr(p.death_date) }
}

export interface RelationshipRecord {
  id: string
  user_id?: string
  from_person: string
  to_person: string
  kind: RelationKind
}

export interface PersonRelatives {
  parents: PersonRecord[]
  partners: PersonRecord[]
  children: PersonRecord[]
  siblings: PersonRecord[]
}

function birthSortKey(p: PersonRecord): number {
  const s = toDateStr(p.birth_date)
  if (!s) return Number.POSITIVE_INFINITY
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

/** Sort people oldest-born first (undated last), then by name. */
export function sortPeopleByBirth(people: PersonRecord[]): PersonRecord[] {
  return [...people].sort((a, b) => {
    const ka = birthSortKey(a)
    const kb = birthSortKey(b)
    if (ka !== kb) return ka - kb
    const na = `${a.last_name ?? ''}${a.first_name}`
    const nb = `${b.last_name ?? ''}${b.first_name}`
    return na.localeCompare(nb)
  })
}

/**
 * Derive a person's relatives from the stored edge list.
 * Siblings = anyone sharing ≥ 1 parent edge target with the person
 * (half-siblings included by design; the person themself excluded).
 */
export function deriveRelatives(
  personId: string,
  people: PersonRecord[],
  relationships: RelationshipRecord[],
): PersonRelatives {
  const byId = new Map(people.map((p) => [p.id, p]))
  const parentIds = new Set<string>()
  const partnerIds = new Set<string>()
  const myParentTargets = new Set<string>()

  for (const rel of relationships) {
    if (rel.kind === 'parent') {
      if (rel.from_person === personId) {
        myParentTargets.add(rel.to_person)
        parentIds.add(rel.to_person)
      }
    } else if (rel.kind === 'partner') {
      if (rel.from_person === personId) partnerIds.add(rel.to_person)
      else if (rel.to_person === personId) partnerIds.add(rel.from_person)
    }
  }

  const childIds = new Set<string>()
  for (const rel of relationships) {
    if (rel.kind === 'parent' && rel.to_person === personId) childIds.add(rel.from_person)
  }

  const siblingIds = new Set<string>()
  if (myParentTargets.size > 0) {
    for (const rel of relationships) {
      if (rel.kind === 'parent' && myParentTargets.has(rel.to_person)) {
        if (rel.from_person !== personId) siblingIds.add(rel.from_person)
      }
    }
  }

  const collect = (ids: Set<string>): PersonRecord[] =>
    sortPeopleByBirth([...ids].map((id) => byId.get(id)).filter((p): p is PersonRecord => !!p))

  return {
    parents: collect(parentIds),
    partners: collect(partnerIds),
    children: collect(childIds),
    siblings: collect(siblingIds),
  }
}

/** An edge that should be created (or is known to exist) between two people. */
export interface PlannedEdge {
  from_person: string
  to_person: string
  kind: RelationKind
}

/**
 * Plan the edges to create when a NEW person (newId) is added as `relation`
 * of an existing person (relativeId). This is the implicit-inverse rule:
 * - parent:   the new person is the PARENT of relative  → edge relative --parent--> new
 * - child:    the new person is a CHILD of relative     → edge new --parent--> relative
 * - partner:  one undirected partner edge, stored once  → edge new --partner--> relative
 * - sibling:  the new person shares relative's parents  → one new --parent--> P edge
 *             for every parent P of relative
 *
 * Pure function — handlers apply it, tests verify it.
 */
export function planRelativeEdges(
  newId: string,
  relativeId: string,
  relation: RelativeRelation,
  relationships: RelationshipRecord[],
): PlannedEdge[] {
  if (relation === 'parent') return [{ from_person: relativeId, to_person: newId, kind: 'parent' }]
  if (relation === 'child') return [{ from_person: newId, to_person: relativeId, kind: 'parent' }]
  if (relation === 'partner')
    return [{ from_person: newId, to_person: relativeId, kind: 'partner' }]

  const parentTargets = relationships
    .filter((rel) => rel.kind === 'parent' && rel.from_person === relativeId)
    .map((rel) => rel.to_person)
  return parentTargets.map((parentId) => ({
    from_person: newId,
    to_person: parentId,
    kind: 'parent' as const,
  }))
}

// ---------------------------------------------------------------------------
// Tree layout
// ---------------------------------------------------------------------------

export interface TreeNode {
  id: string
  /** Row index, 0 = eldest displayed generation. */
  generation: number
  /** Column slot within the row (0-based; multiply by card width client-side). */
  x: number
  person: PersonRecord
  isRoot: boolean
}

export interface TreeEdge {
  kind: RelationKind
  /** For parent edges: the child. For partner edges: one side. */
  fromId: string
  /** For parent edges: the parent. For partner edges: the other side. */
  toId: string
}

export interface TreeLayout {
  rootId: string
  nodes: TreeNode[]
  edges: TreeEdge[]
  stats: { people: number; generations: number }
}

/**
 * Pick the default tree root: a person with no recorded parents (preferring
 * the one with the most descendants so the biggest branch stays on-chart),
 * falling back to the earliest-born person.
 */
export function suggestRoot(
  people: PersonRecord[],
  relationships: RelationshipRecord[],
): string | null {
  if (people.length === 0) return null
  const hasParents = new Set(
    relationships.filter((r) => r.kind === 'parent').map((r) => r.from_person),
  )
  const childCount = new Map<string, number>()
  for (const rel of relationships) {
    if (rel.kind === 'parent')
      childCount.set(rel.to_person, (childCount.get(rel.to_person) ?? 0) + 1)
  }
  const ancestorless = people.filter((p) => !hasParents.has(p.id))
  const pool = ancestorless.length > 0 ? ancestorless : people
  const sorted = sortPeopleByBirth(pool)
  if (ancestorless.length === 0) return sorted[0].id
  // Descendant reach: rough proxy via direct children + grandchildren.
  const reach = (id: string): number => {
    const kids = relationships
      .filter((r) => r.kind === 'parent' && r.to_person === id)
      .map((r) => r.from_person)
    const grandKids = relationships.filter(
      (r) => r.kind === 'parent' && kids.includes(r.from_person),
    ).length
    return kids.length + grandKids
  }
  return [...sorted].sort((a, b) => reach(b.id) - reach(a.id))[0].id
}

/**
 * Build a deterministic generational layout for the connected component
 * containing `rootId`.
 *
 * Rows: BFS distance from the root — parents one row up (generation - 1),
 * children one row down (+1), partners share their partner's row. Row indices
 * are normalized so the eldest displayed generation is 0.
 *
 * Column order per row: family units (people sharing the same parent set,
 * ordered by their parents' column positions) first, then married-in partners
 * next to their spouse, then unrelated people oldest-born first.
 */
export function buildTreeLayout(
  rootId: string,
  people: PersonRecord[],
  relationships: RelationshipRecord[],
): TreeLayout {
  const byId = new Map(people.map((p) => [p.id, p]))
  if (!byId.has(rootId)) {
    return { rootId, nodes: [], edges: [], stats: { people: 0, generations: 0 } }
  }

  // -- 1. Connected component + adjacency over every stored edge ----------
  type Adj = { parents: string[]; children: string[]; partners: string[] }
  const adj = new Map<string, Adj>()
  const ensure = (id: string): Adj => {
    let a = adj.get(id)
    if (!a) {
      a = { parents: [], children: [], partners: [] }
      adj.set(id, a)
    }
    return a
  }
  for (const rel of relationships) {
    if (rel.kind === 'parent') {
      ensure(rel.from_person).parents.push(rel.to_person)
      ensure(rel.to_person).children.push(rel.from_person)
    } else {
      ensure(rel.from_person).partners.push(rel.to_person)
      ensure(rel.to_person).partners.push(rel.from_person)
    }
  }
  // The root may have no edges at all — give it an empty adjacency entry so
  // the BFS below can dereference it.
  ensure(rootId)

  const component: string[] = []
  const seen = new Set<string>()
  const queue = [rootId]
  seen.add(rootId)
  while (queue.length > 0) {
    const id = queue.shift() as string
    component.push(id)
    for (const n of [...adj.get(id)!.parents, ...adj.get(id)!.children, ...adj.get(id)!.partners]) {
      if (byId.has(n) && !seen.has(n)) {
        seen.add(n)
        queue.push(n)
      }
    }
  }

  // -- 2. Generation (row) assignment via BFS from the root ---------------
  const rawGen = new Map<string, number>([[rootId, 0]])
  const genQueue: string[] = [rootId]
  while (genQueue.length > 0) {
    const id = genQueue.shift() as string
    const g = rawGen.get(id) as number
    const a = adj.get(id)!
    for (const p of a.parents) {
      if (component.includes(p) && !rawGen.has(p)) {
        rawGen.set(p, g - 1)
        genQueue.push(p)
      }
    }
    for (const c of a.children) {
      if (component.includes(c) && !rawGen.has(c)) {
        rawGen.set(c, g + 1)
        genQueue.push(c)
      }
    }
    for (const sp of a.partners) {
      if (component.includes(sp) && !rawGen.has(sp)) {
        rawGen.set(sp, g)
        genQueue.push(sp)
      }
    }
  }
  const minGen = Math.min(...[...rawGen.values()])
  const generationOf = (id: string): number => (rawGen.get(id) as number) - minGen
  const generations = Math.max(...[...rawGen.values()]) - minGen + 1

  // -- 3. Column ordering, top row first ----------------------------------
  const rows: string[][] = Array.from({ length: generations }, () => [])
  for (const id of component) rows[generationOf(id)].push(id)

  const parentsOf = (id: string): string[] => adj.get(id)!.parents.filter((p) => rawGen.has(p))
  const partnerOfInRow = (id: string, row: string[]): string | null => {
    for (const sp of adj.get(id)!.partners) if (row.includes(sp) && sp !== id) return sp
    return null
  }

  const slotOf = new Map<string, number>()
  const placed: string[] = []
  for (const row of rows) {
    // Unit key: sorted tuple of parents, so full + half siblings cluster.
    const unitKeyOf = new Map<string, string>()
    for (const id of row) {
      const ps = parentsOf(id)
        .filter((p) => slotOf.has(p))
        .sort()
      unitKeyOf.set(id, ps.length > 0 ? `p:${ps.join(',')}` : '')
    }
    // Married-in partners (no placed parents) JOIN their in-row spouse's unit
    // so couples render adjacently; if both spouses have placed parents they
    // stay under their own family units and the swap pass below reunites them.
    const joinedUnit = new Map<string, string>()
    for (const id of row) {
      if (unitKeyOf.get(id) !== '') continue
      const sp = partnerOfInRow(id, row)
      if (sp && unitKeyOf.get(sp) !== '') joinedUnit.set(id, unitKeyOf.get(sp) as string)
    }
    // Anchor for a unit = average parent slot; solos anchor by birth order.
    const anchorOf = (ids: string[]): number | null => {
      const slots = ids
        .flatMap((id) => parentsOf(id))
        .filter((p) => slotOf.has(p))
        .map((p) => slotOf.get(p) as number)
      if (slots.length === 0) return null
      return slots.reduce((s, v) => s + v, 0) / slots.length
    }

    const units = new Map<string, string[]>()
    for (const id of row) {
      const key = joinedUnit.get(id) ?? unitKeyOf.get(id) ?? `solo:${id}`
      const list = units.get(key) ?? []
      list.push(id)
      units.set(key, list)
    }
    const unitList = [...units.entries()].map(([key, ids]) => {
      const ordered = sortPeopleByBirth(ids.map((id) => byId.get(id)!)).map((p) => p.id)
      // Inside a unit, seat each married-in member directly after their spouse.
      for (const id of [...ordered]) {
        if (!joinedUnit.has(id)) continue
        const sp = partnerOfInRow(id, ordered)
        if (!sp) continue
        const from = ordered.indexOf(id)
        const to = ordered.indexOf(sp) + 1
        if (to < from) {
          ordered.splice(from, 1)
          ordered.splice(to, 0, id)
        }
      }
      return { key, ids: ordered, anchor: anchorOf(ids) }
    })
    unitList.sort((a, b) => {
      if (a.anchor !== null && b.anchor !== null) return a.anchor - b.anchor
      if (a.anchor !== null) return -1
      if (b.anchor !== null) return 1
      return birthSortKey(byId.get(a.ids[0])!) - birthSortKey(byId.get(b.ids[0])!)
    })

    const rowOrder: string[] = unitList.flatMap((unit) => unit.ids)
    // Partner-adjacency pass: one left-to-right sweep — if a person's in-row
    // partner is not already adjacent, swap the partner with the person's
    // right-hand neighbour (unless that neighbour is partnered with them).
    for (let i = 0; i < rowOrder.length; i++) {
      const id = rowOrder[i]
      const sp = partnerOfInRow(id, rowOrder)
      if (!sp) continue
      const j = rowOrder.indexOf(sp)
      if (Math.abs(j - i) <= 1) continue
      const neighbourIdx = Math.min(i + 1, rowOrder.length - 1)
      const neighbour = rowOrder[neighbourIdx]
      if (neighbour === sp) continue
      if (partnerOfInRow(neighbour, rowOrder) === id) continue
      rowOrder[neighbourIdx] = sp
      rowOrder[j] = neighbour
    }

    let slot = 0
    for (const id of rowOrder) {
      slotOf.set(id, slot)
      placed.push(id)
      slot += 1
    }
  }

  const nodes: TreeNode[] = placed.map((id) => ({
    id,
    generation: generationOf(id),
    x: slotOf.get(id) as number,
    person: byId.get(id)!,
    isRoot: id === rootId,
  }))

  const inComponent = (id: string): boolean => rawGen.has(id)
  const edges: TreeEdge[] = relationships
    .filter((rel) => inComponent(rel.from_person) && inComponent(rel.to_person))
    .map((rel) => ({ kind: rel.kind, fromId: rel.from_person, toId: rel.to_person }))

  return { rootId, nodes, edges, stats: { people: component.length, generations } }
}

// ---------------------------------------------------------------------------
// Life timeline
// ---------------------------------------------------------------------------

export type LifeEventKind = 'birth' | 'death' | 'partnership' | 'child'

export interface LifeEvent {
  /** ISO date (YYYY-MM-DD) when known; null for undated events. */
  date: string | null
  kind: LifeEventKind
  /** Free-form detail, e.g. the place or the related person's name. */
  detail: string
}

/**
 * Derive a person's life timeline from the graph: birth, partnerships,
 * each child's birth, and death — chronologically sorted, undated last.
 */
export function buildLifeTimeline(person: PersonRecord, relatives: PersonRelatives): LifeEvent[] {
  const events: LifeEvent[] = []
  const nameOf = (p: PersonRecord): string => [p.first_name, p.last_name].filter(Boolean).join(' ')
  const birth = toDateStr(person.birth_date)
  if (birth) {
    events.push({
      date: birth,
      kind: 'birth',
      detail: person.birth_place ?? '',
    })
  }
  for (const partner of relatives.partners) {
    events.push({
      date: null,
      kind: 'partnership',
      detail: nameOf(partner),
    })
  }
  for (const child of relatives.children) {
    events.push({
      date: toDateStr(child.birth_date),
      kind: 'child',
      detail: nameOf(child),
    })
  }
  const death = toDateStr(person.death_date)
  if (death) {
    events.push({
      date: death,
      kind: 'death',
      detail: person.death_place ?? '',
    })
  }
  return events.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date.localeCompare(b.date)
  })
}

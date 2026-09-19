/**
 * Shared family-tree API payload types + display helpers.
 *
 * Mirrors the server's contract in
 * `api/src/handlers/{_graph,people,tree}.ts` — keep the field names in sync
 * when the API changes.
 */

export interface Person {
  id: string
  first_name: string
  last_name?: string | null
  maiden_name?: string | null
  gender?: string | null
  birth_date?: string | null
  birth_place?: string | null
  death_date?: string | null
  death_place?: string | null
  notes?: string | null
  photo_url?: string | null
}

export interface PersonRelatives {
  parents: Person[]
  partners: Person[]
  children: Person[]
  siblings: Person[]
}

export type LifeEventKind = 'birth' | 'death' | 'partnership' | 'child'

export interface LifeEvent {
  date: string | null
  kind: LifeEventKind
  detail: string
}

/** GET /api/people/:id payload — person + derived relatives + life timeline. */
export interface PersonDetailPayload extends Person {
  relatives: PersonRelatives
  timeline: LifeEvent[]
}

export type RelationKind = 'parent' | 'partner'

export interface TreeEdge {
  kind: RelationKind
  fromId: string
  toId: string
}

export interface TreeNode {
  id: string
  generation: number
  x: number
  person: Person
  isRoot: boolean
}

/** GET /api/tree payload — generational layout for the Tree screen. */
export interface TreePayload {
  rootId: string | null
  nodes: TreeNode[]
  edges: TreeEdge[]
  stats: { people: number; generations: number }
}

export type RelativeRelation = 'parent' | 'partner' | 'child' | 'sibling'

/** "Jordan Hutchins" (falls back to the first name alone). */
export function displayName(p: Person): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

/** "1994 –" for living people, "1938 – 2016" for deceased, '' unknown. */
export function yearsLabel(p: Person): string {
  const from = p.birth_date ? p.birth_date.slice(0, 4) : ''
  const to = p.death_date ? p.death_date.slice(0, 4) : ''
  if (!from && !to) return ''
  if (from && to) return `${from} – ${to}`
  if (from) return `${from} –`
  return `– ${to}`
}

/** "June 9, 1994" for a YYYY-MM-DD string; null when absent/invalid. */
export function formatFullDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

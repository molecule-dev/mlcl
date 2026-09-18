/**
 * Real API hooks for the note-taking app.
 *
 * Each hook talks to the Express backend (`api/src/handlers/*.ts`) via
 * the molecule HTTP bond. No mocks, no seed data — every call hits the
 * production code path so Playwright e2e tests prove the full stack
 * works.
 *
 * Workspaces are auto-created on first load: a fresh user lands on the
 * app with no workspace, the hook creates a default one ("My notebook")
 * and reuses it for every subsequent fetch.
 */

import { useCallback, useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

export interface Workspace {
  id: string
  name: string
  icon: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface PageRow {
  id: string
  workspace_id: string
  parent_id: string | null
  template_id: string | null
  title: string
  icon: string | null
  cover_image: string | null
  position: number
  is_favorited: boolean
  is_template: boolean
  trashed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type BlockType =
  | 'paragraph'
  | 'text'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo'
  | 'code'
  | 'image'
  | 'embed'
  | 'table'
  | 'divider'
  | 'quote'
  | 'callout'
  | 'database_view'

export interface BlockRow {
  id: string
  page_id: string
  parent_block_id: string | null
  type: BlockType
  content: { text?: string; lang?: string; checked?: boolean; [k: string]: unknown }
  properties: Record<string, unknown>
  position: number
  created_at: string
  updated_at: string
}

export interface PageWithBlocks extends PageRow {
  blocks: BlockRow[]
}

export interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxBlocks: number
    maxDatabases: number
    maxPages: number
    maxTemplates: number
    maxWorkspaces: number
    advancedFeatures?: boolean
    canExport?: boolean
  }
}

const DEFAULT_WORKSPACE_NAME = 'My notebook'

// Module-level guard: every consumer of useDefaultWorkspace shares this
// in-flight promise, so React strict-mode double-effects + concurrent
// page loads never both POST a second "My notebook" workspace.
let bootstrapPromise: Promise<Workspace> | null = null

async function bootstrapDefaultWorkspace(
  http: ReturnType<typeof useHttpClient>,
): Promise<Workspace> {
  if (bootstrapPromise) return bootstrapPromise
  bootstrapPromise = (async () => {
    const list = await http.get<Workspace[]>('/workspaces')
    const items = Array.isArray(list.data) ? list.data : []
    if (items.length > 0) return items[0]!
    const created = await http.post<Workspace>('/workspaces', { name: DEFAULT_WORKSPACE_NAME })
    return created.data
  })()
  try {
    return await bootstrapPromise
  } finally {
    bootstrapPromise = null
  }
}

/**
 * Returns the user's default workspace. Auto-creates one named
 * "My notebook" on first call so a freshly-signed-up user always has
 * a workspace to write into.
 */
export function useDefaultWorkspace(): {
  workspace: Workspace | null
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
} {
  const http = useHttpClient()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ws = await bootstrapDefaultWorkspace(http)
      setWorkspace(ws)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    reload()
  }, [reload])

  return { workspace, loading, error, reload }
}

/**
 * Lists pages in a workspace (top-level, non-trashed by default).
 */
export function useWorkspacePages(
  workspaceId: string | null | undefined,
  opts?: { parentId?: string | null; includeTrashed?: boolean },
): {
  pages: PageRow[]
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
  createPage: (input: {
    title?: string
    parent_id?: string | null
    icon?: string | null
  }) => Promise<PageRow>
  trashPage: (id: string) => Promise<void>
  updatePage: (
    id: string,
    patch: Partial<Pick<PageRow, 'title' | 'icon' | 'is_favorited'>>,
  ) => Promise<PageRow>
} {
  const http = useHttpClient()
  const [pages, setPages] = useState<PageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setPages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { workspace_id: workspaceId }
      if (opts?.parentId) params.parent_id = opts.parentId
      if (opts?.includeTrashed) params.include_trashed = 'true'
      const res = await http.get<PageRow[]>('/pages', { params })
      setPages(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [http, workspaceId, opts?.parentId, opts?.includeTrashed])

  useEffect(() => {
    reload()
  }, [reload])

  const createPage = useCallback(
    async (input: { title?: string; parent_id?: string | null; icon?: string | null }) => {
      if (!workspaceId) throw new Error('No workspace')
      const res = await http.post<PageRow>('/pages', {
        workspace_id: workspaceId,
        title: input.title ?? 'Untitled',
        parent_id: input.parent_id ?? null,
        icon: input.icon ?? null,
      })
      await reload()
      return res.data
    },
    [http, workspaceId, reload],
  )

  const trashPage = useCallback(
    async (id: string) => {
      await http.post(`/pages/${id}/trash`, {})
      await reload()
    },
    [http, reload],
  )

  const updatePage = useCallback(
    async (id: string, patch: Partial<Pick<PageRow, 'title' | 'icon' | 'is_favorited'>>) => {
      const res = await http.patch<PageRow>(`/pages/${id}`, patch)
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...res.data } : p)))
      return res.data
    },
    [http],
  )

  return { pages, loading, error, reload, createPage, trashPage, updatePage }
}

/**
 * Loads a single page + its blocks.
 */
export function usePage(pageId: string | null | undefined): {
  page: PageWithBlocks | null
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
  updateTitle: (title: string) => Promise<void>
  addBlock: (type?: BlockType, text?: string) => Promise<BlockRow>
  updateBlock: (
    id: string,
    patch: { type?: BlockType; content?: BlockRow['content'] },
  ) => Promise<void>
  deleteBlock: (id: string) => Promise<void>
} {
  const http = useHttpClient()
  const [page, setPage] = useState<PageWithBlocks | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    if (!pageId) {
      setPage(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<PageWithBlocks>(`/pages/${pageId}`)
      setPage(res.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [http, pageId])

  useEffect(() => {
    reload()
  }, [reload])

  const updateTitle = useCallback(
    async (title: string) => {
      if (!pageId) return
      const res = await http.patch<PageRow>(`/pages/${pageId}`, { title })
      setPage((prev) => (prev ? { ...prev, ...res.data, blocks: prev.blocks } : prev))
    },
    [http, pageId],
  )

  const addBlock = useCallback(
    async (type: BlockType = 'paragraph', text = '') => {
      if (!pageId) throw new Error('No page')
      const res = await http.post<BlockRow>('/blocks', {
        page_id: pageId,
        type,
        content: text ? { text } : {},
      })
      setPage((prev) => (prev ? { ...prev, blocks: [...prev.blocks, res.data] } : prev))
      return res.data
    },
    [http, pageId],
  )

  const updateBlock = useCallback(
    async (id: string, patch: { type?: BlockType; content?: BlockRow['content'] }) => {
      const res = await http.patch<BlockRow>(`/blocks/${id}`, patch)
      setPage((prev) =>
        prev ? { ...prev, blocks: prev.blocks.map((b) => (b.id === id ? res.data : b)) } : prev,
      )
    },
    [http],
  )

  const deleteBlock = useCallback(
    async (id: string) => {
      await http.delete(`/blocks/${id}`)
      setPage((prev) => (prev ? { ...prev, blocks: prev.blocks.filter((b) => b.id !== id) } : prev))
    },
    [http],
  )

  return { page, loading, error, reload, updateTitle, addBlock, updateBlock, deleteBlock }
}

/**
 * Live-search pages by title prefix within a workspace.
 */
export function useSearchPages(
  workspaceId: string | null | undefined,
  query: string,
): {
  hits: PageRow[]
  loading: boolean
  error: Error | null
} {
  const http = useHttpClient()
  const [hits, setHits] = useState<PageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!workspaceId || trimmed.length === 0) {
      setHits([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const handle = setTimeout(async () => {
      try {
        const res = await http.get<PageRow[]>('/pages/search', {
          params: { workspace_id: workspaceId, q: trimmed },
        })
        if (!cancelled) setHits(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [http, workspaceId, query])

  return { hits, loading, error }
}

/**
 * Loads the current user's effective billing tier.
 */
export function useBillingStatus(): {
  status: BillingStatus | null
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
} {
  const http = useHttpClient()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<BillingStatus>('/billing/status')
      setStatus(res.data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    reload()
  }, [reload])

  return { status, loading, error, reload }
}

/**
 * Pretty-prints a recent timestamp as relative time (Today / Yesterday /
 * <date>). Handed plain ISO strings from the API.
 */
export function formatUpdatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return `Today · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const sameYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (sameYesterday)
    return `Yesterday · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * Extracts a one-line excerpt from a list of blocks for list-card display.
 */
export function blocksExcerpt(blocks: BlockRow[]): string {
  for (const block of blocks) {
    const text = (block.content?.text as string | undefined) ?? ''
    if (text.trim().length > 0) return text.trim().slice(0, 220)
  }
  return ''
}

/**
 * Sums word counts across blocks (rough — splits on whitespace).
 */
export function blocksWordCount(blocks: BlockRow[]): number {
  let n = 0
  for (const block of blocks) {
    const text = (block.content?.text as string | undefined) ?? ''
    if (!text) continue
    n += text.trim().split(/\s+/).filter(Boolean).length
  }
  return n
}

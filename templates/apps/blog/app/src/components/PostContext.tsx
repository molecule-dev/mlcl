import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient } from '@molecule/app-react'

export interface BlogPost {
  id: string
  author_id: string | null
  title: string
  slug?: string | null
  content?: string | null
  excerpt?: string | null
  category_id?: string | null
  tags?: string | string[] | null
  cover_image_url?: string | null
  status?: string | null
  published_at?: string | null
  scheduled_at?: string | null
  views?: number | null
  claps?: number | null
  comment_count?: number | null
  bookmarked?: boolean | null
  clapped?: boolean | null
  author_name?: string | null
  author_email?: string | null
  author_bio?: string | null
}

interface PostContextValue {
  post: BlogPost | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setLocalPost: (next: BlogPost) => void
}

const PostContext = createContext<PostContextValue | null>(null)

export function usePost(): PostContextValue {
  const ctx = useContext(PostContext)
  if (!ctx) {
    throw new Error('usePost must be used within PostProvider')
  }
  return ctx
}

function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch (_error) {
    // tags is not valid JSON — treat as a plain string fallback
    return []
  }
}

export function tagsArray(post: BlogPost | null): string[] {
  return parseTags(post?.tags)
}

interface PostProviderProps {
  postId?: string
  children: ReactNode
}

export function PostProvider({ postId, children }: PostProviderProps) {
  const { id: routeId } = useParams<{ id: string }>()
  const id = postId ?? routeId
  const http = useHttpClient()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useMemo(
    () => async () => {
      if (!id) {
        setError('Missing post id.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await http.get<BlogPost>(`/api/posts/${id}`)
        const payload = res.data
        if (payload && (payload as BlogPost).id) {
          setPost(payload as BlogPost)
        } else {
          setPost(null)
          setError('Post not found.')
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not load post.')
        setPost(null)
      } finally {
        setLoading(false)
      }
    },
    [http, id],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      await refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Track view exactly once per post id per mount.
  useEffect(() => {
    if (!id) return
    void http.post(`/api/posts/${id}/view`, {}).catch(() => {})
  }, [http, id])

  const value = useMemo(
    () => ({
      post,
      loading,
      error,
      refresh,
      setLocalPost: (next: BlogPost) => setPost(next),
    }),
    [post, loading, error, refresh],
  )

  return <PostContext.Provider value={value}>{children}</PostContext.Provider>
}

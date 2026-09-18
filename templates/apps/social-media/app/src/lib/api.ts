import { useCallback, useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

import type {
  SampleAuthor,
  SampleComment,
  SampleConversation,
  SampleNotification,
  SamplePost,
} from './sample-feed.js'

export interface ApiUserProfile extends SampleAuthor {
  follower_count: number
  following_count: number
  post_count: number
  is_following?: boolean
  is_self?: boolean
}

export interface ApiThreadMessage {
  id: string
  content: string
  sender_id: string
  from_me: boolean
  sent_at: string
  seen_at: string | null
}

export interface ApiSuggestion extends SampleAuthor {
  reason: string
  mutual_count: number
}

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function useFetch<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const result = await load(controller.signal)
      setData(result)
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is a caller-supplied dependency array; load is stable
  }, deps)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    load(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if ((err as { name?: string })?.name === 'AbortError') return
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is a caller-supplied dependency array; load is stable
  }, deps)

  return { data, loading, error, refetch }
}

export function useFeedPosts(): AsyncState<SamplePost[]> {
  const http = useHttpClient()
  return useFetch<SamplePost[]>(async () => {
    const res = await http.get<SamplePost[]>('/feed')
    return Array.isArray(res.data) ? res.data : []
  }, [http])
}

export function useExplorePosts(): AsyncState<SamplePost[]> {
  const http = useHttpClient()
  return useFetch<SamplePost[]>(async () => {
    const res = await http.get<SamplePost[]>('/feed/explore')
    return Array.isArray(res.data) ? res.data : []
  }, [http])
}

export function useSuggestions(): AsyncState<ApiSuggestion[]> {
  const http = useHttpClient()
  return useFetch<ApiSuggestion[]>(async () => {
    const res = await http.get<ApiSuggestion[]>('/feed/suggestions')
    return Array.isArray(res.data) ? res.data : []
  }, [http])
}

export function useTrendingHashtags(): AsyncState<
  Array<{ tag: string; post_count: number; delta_pct: number }>
> {
  const http = useHttpClient()
  return useFetch<Array<{ tag: string; post_count: number; delta_pct: number }>>(async () => {
    const res =
      await http.get<Array<{ tag: string; post_count: number; delta_pct: number }>>(
        '/feed/hashtags',
      )
    return Array.isArray(res.data) ? res.data : []
  }, [http])
}

export function useUserProfile(handle: string): AsyncState<ApiUserProfile> {
  const http = useHttpClient()
  return useFetch<ApiUserProfile>(async () => {
    const res = await http.get<ApiUserProfile>(`/profile/${encodeURIComponent(handle)}`)
    return res.data
  }, [http, handle])
}

export function useUserPosts(handle: string): AsyncState<SamplePost[]> {
  const http = useHttpClient()
  return useFetch<SamplePost[]>(async () => {
    const res = await http.get<SamplePost[]>(`/profile/${encodeURIComponent(handle)}/posts`)
    return Array.isArray(res.data) ? res.data : []
  }, [http, handle])
}

export function usePostDetail(id: string): AsyncState<SamplePost> {
  const http = useHttpClient()
  return useFetch<SamplePost>(async () => {
    const res = await http.get<SamplePost>(`/posts/${encodeURIComponent(id)}`)
    return res.data
  }, [http, id])
}

export function usePostComments(id: string): AsyncState<SampleComment[]> {
  const http = useHttpClient()
  return useFetch<SampleComment[]>(async () => {
    const res = await http.get<SampleComment[]>(`/posts/${encodeURIComponent(id)}/comments`)
    return Array.isArray(res.data) ? res.data : []
  }, [http, id])
}

export function useNotifications(): AsyncState<SampleNotification[]> {
  const http = useHttpClient()
  return useFetch<SampleNotification[]>(async () => {
    const res = await http.get<SampleNotification[]>('/notifications')
    return Array.isArray(res.data) ? res.data : []
  }, [http])
}

export function useConversations(): AsyncState<SampleConversation[]> {
  const http = useHttpClient()
  return useFetch<SampleConversation[]>(async () => {
    const res = await http.get<SampleConversation[]>('/messages/threads')
    return Array.isArray(res.data) ? res.data : []
  }, [http])
}

export function useThreadMessages(threadId: string | null): AsyncState<ApiThreadMessage[]> {
  const http = useHttpClient()
  return useFetch<ApiThreadMessage[]>(async () => {
    if (!threadId) return []
    const res = await http.get<ApiThreadMessage[]>(
      `/messages/threads/${encodeURIComponent(threadId)}/messages`,
    )
    return Array.isArray(res.data) ? res.data : []
  }, [http, threadId])
}

export function useSearchPosts(query: string): AsyncState<SamplePost[]> {
  const http = useHttpClient()
  return useFetch<SamplePost[]>(async () => {
    const trimmed = query.trim()
    if (trimmed.length === 0) return []
    const res = await http.get<SamplePost[]>(`/search/posts?q=${encodeURIComponent(trimmed)}`)
    return Array.isArray(res.data) ? res.data : []
  }, [http, query])
}

export function useSearchUsers(query: string): AsyncState<SampleAuthor[]> {
  const http = useHttpClient()
  return useFetch<SampleAuthor[]>(async () => {
    const trimmed = query.trim()
    if (trimmed.length === 0) return []
    const res = await http.get<SampleAuthor[]>(`/search/users?q=${encodeURIComponent(trimmed)}`)
    return Array.isArray(res.data) ? res.data : []
  }, [http, query])
}

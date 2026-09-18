import { findMany } from '@molecule/api-database'

interface RawPost {
  id: string
  user_id: string
  caption: string
  media_urls: unknown
  thumbnail_url: string | null
  hashtags: string[] | null
  location: string | null
  visibility: string
  like_count: number
  comment_count: number
  created_at: string | Date
  updated_at?: string | Date | null
}

interface RawUser {
  id: string
  username: string | null
  name: string | null
  email: string | null
  oauthData?: { bio?: string | null } | null
}

interface EnrichedAuthor {
  id: string
  display_name: string
  handle: string
  cover_index: number
  is_verified: boolean
  bio: string
}

export interface EnrichedPost {
  id: string
  user_id: string
  author: EnrichedAuthor
  caption: string
  cover_index: number
  aspect: 'tall' | 'wide' | 'square'
  like_count: number
  comment_count: number
  share_count: number
  liked: boolean
  saved: boolean
  location: string | null
  posted_at: string
  tags: string[]
  is_live: boolean
  media_urls: string[]
  thumbnail_url: string | null
  visibility: string
}

/** Deterministic 0..6 derived from the first chars of a UUID. */
function indexFromId(id: string): number {
  let acc = 0
  for (let i = 0; i < id.length; i++) acc = (acc + id.charCodeAt(i)) % 7
  return acc
}

function deriveHandle(user: RawUser): string {
  if (user.username) return user.username
  if (user.email)
    return (
      user.email
        .split('@')[0]
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase() || 'user'
    )
  return `user_${user.id.slice(0, 6)}`
}

function deriveDisplayName(user: RawUser): string {
  return user.name || deriveHandle(user)
}

function deriveAspect(mediaUrls: unknown): 'tall' | 'wide' | 'square' {
  if (Array.isArray(mediaUrls) && mediaUrls.length >= 2) return 'wide'
  return 'square'
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  return []
}

export function buildAuthor(user: RawUser): EnrichedAuthor {
  return {
    id: user.id,
    display_name: deriveDisplayName(user),
    handle: deriveHandle(user),
    cover_index: indexFromId(user.id),
    is_verified: false,
    bio: typeof user.oauthData?.bio === 'string' ? user.oauthData.bio : '',
  }
}

export async function enrichPosts(
  posts: RawPost[],
  viewerId: string | null,
): Promise<EnrichedPost[]> {
  if (posts.length === 0) return []

  const userIds = Array.from(new Set(posts.map((p) => p.user_id)))
  const users =
    userIds.length === 0
      ? []
      : await findMany<RawUser>('users', {
          where: [{ field: 'id', operator: 'in', value: userIds }],
          limit: userIds.length,
        })
  const userMap = new Map<string, RawUser>(users.map((u) => [u.id, u]))

  let likedSet = new Set<string>()
  let savedSet = new Set<string>()
  if (viewerId) {
    const postIds = posts.map((p) => p.id)
    const likes = await findMany<{ post_id: string }>('post_likes', {
      where: [
        { field: 'post_id', operator: 'in', value: postIds },
        { field: 'user_id', operator: '=', value: viewerId },
      ],
      limit: postIds.length,
    })
    likedSet = new Set(likes.map((l) => l.post_id))
    const bookmarks = await findMany<{ resourceId: string }>('bookmarks', {
      where: [
        { field: 'resourceType', operator: '=', value: 'post' },
        { field: 'resourceId', operator: 'in', value: postIds },
        { field: 'userId', operator: '=', value: viewerId },
      ],
      limit: postIds.length,
    })
    savedSet = new Set(bookmarks.map((b) => b.resourceId))
  }

  return posts.map((post): EnrichedPost => {
    const user = userMap.get(post.user_id) ?? {
      id: post.user_id,
      username: null,
      name: null,
      email: null,
    }
    const mediaUrls = ensureArray<string>(post.media_urls)
    return {
      id: post.id,
      user_id: post.user_id,
      author: buildAuthor(user),
      caption: post.caption ?? '',
      cover_index: indexFromId(post.id),
      aspect: deriveAspect(post.media_urls),
      like_count: Number(post.like_count) || 0,
      comment_count: Number(post.comment_count) || 0,
      share_count: 0,
      liked: likedSet.has(post.id),
      saved: savedSet.has(post.id),
      location: post.location,
      posted_at:
        post.created_at instanceof Date ? post.created_at.toISOString() : String(post.created_at),
      tags: ensureArray<string>(post.hashtags),
      is_live: false,
      media_urls: mediaUrls,
      thumbnail_url: post.thumbnail_url,
      visibility: post.visibility,
    }
  })
}

export interface EnrichedUserProfile {
  id: string
  display_name: string
  handle: string
  cover_index: number
  is_verified: boolean
  bio: string
  follower_count: number
  following_count: number
  post_count: number
  is_following?: boolean
  is_self?: boolean
}

export async function enrichUser(
  user: RawUser,
  viewerId: string | null,
): Promise<EnrichedUserProfile> {
  const author = buildAuthor(user)

  const [followers, following, posts] = await Promise.all([
    findMany<{ id: string }>('user_follows', {
      where: [{ field: 'following_id', operator: '=', value: user.id }],
      limit: 1000,
    }),
    findMany<{ id: string }>('user_follows', {
      where: [{ field: 'follower_id', operator: '=', value: user.id }],
      limit: 1000,
    }),
    findMany<{ id: string }>('posts', {
      where: [{ field: 'user_id', operator: '=', value: user.id }],
      limit: 5000,
    }),
  ])

  let isFollowing: boolean | undefined = undefined
  if (viewerId && viewerId !== user.id) {
    const exists = await findMany<{ id: string }>('user_follows', {
      where: [
        { field: 'follower_id', operator: '=', value: viewerId },
        { field: 'following_id', operator: '=', value: user.id },
      ],
      limit: 1,
    })
    isFollowing = exists.length > 0
  }

  return {
    ...author,
    follower_count: followers.length,
    following_count: following.length,
    post_count: posts.length,
    is_following: isFollowing,
    is_self: viewerId === user.id,
  }
}

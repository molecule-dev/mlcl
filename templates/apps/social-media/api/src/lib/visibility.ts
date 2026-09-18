export interface VisibilityPost {
  user_id?: string | null
  visibility?: string | null
}

/**
 * Whether a post is visible to a viewer, given the set of authors the viewer follows.
 *
 * Mirrors the SQL visibility gates the feed/profile/search reads apply, for the one read (the
 * /saved bookmarks list) that fetches posts by id and so must filter in JS: `public` → everyone;
 * the author always sees their own post; `followers` → only the author's followers; `private` →
 * author only. Missing/unknown visibility is treated as public (the column default). Without this,
 * a followers-only or private post the viewer had bookmarked would leak back through /saved.
 */
export function isPostVisibleToViewer(
  post: VisibilityPost,
  viewerId: string,
  followedAuthorIds: ReadonlySet<string>,
): boolean {
  const author = post.user_id == null ? null : String(post.user_id)
  if (author !== null && author === viewerId) return true
  const visibility = post.visibility ?? 'public'
  if (visibility === 'public') return true
  if (visibility === 'followers') return author !== null && followedAuthorIds.has(author)
  return false
}

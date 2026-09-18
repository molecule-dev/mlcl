import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import PostEditorAIButton from '../components/PostEditorAIButton.js'
import PostEditorBody from '../components/PostEditorBody.js'
import PostEditorCoverImage from '../components/PostEditorCoverImage.js'
import PostEditorFooter from '../components/PostEditorFooter.js'
import PostEditorHeader from '../components/PostEditorHeader.js'
import PostEditorTagsSection from '../components/PostEditorTagsSection.js'
import PostEditorTopNavBar from '../components/PostEditorTopNavBar.js'
function PostEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: routeId } = useParams<{ id: string }>()
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [postId, setPostId] = useState<string | null>(routeId ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const http = useHttpClient()
  const navigate = useNavigate()

  // Hydrate the editor when navigated to via /posts/:id/edit so users
  // can actually update existing posts (without this, the form starts
  // empty and "Save Draft" creates a new duplicate post).
  useEffect(() => {
    if (!routeId) return
    let active = true
    setLoading(true)
    http
      .get(`/api/posts/${routeId}`)
      .then((res: unknown) => {
        if (!active) return
        const r = res as { data?: Record<string, unknown> } | Record<string, unknown> | null
        const body = (r && typeof r === 'object' && 'data' in r ? r.data : r) as Record<
          string,
          unknown
        > | null
        if (!body) return
        setPostId((body.id as string) ?? routeId)
        setTitle((body.title as string) ?? '')
        setExcerpt((body.excerpt as string) ?? '')
        setBody((body.content as string) ?? '')
        const rawTags = body.tags
        if (typeof rawTags === 'string') {
          try {
            const parsed = JSON.parse(rawTags)
            if (Array.isArray(parsed)) setTags(parsed.map(String))
          } catch (_error) {
            // rawTags is not valid JSON — fall back to comma-separated parsing
            setTags(
              rawTags
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        } else if (Array.isArray(rawTags)) {
          setTags(rawTags.map(String))
        }
        setCoverImage((body.cover_image_url as string) || null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t('postEditor.loadFailed', {}, { defaultValue: 'Failed to load post' }),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [routeId, http, t])
  async function handlePublish() {
    setLoading(true)
    setError(null)
    try {
      // If we already have a postId (loaded from /posts/:id/edit OR a
      // previously-saved draft) update that row in place — don't fork a
      // duplicate. Otherwise create + publish in one shot via the
      // status=published payload accepted by POST /api/posts.
      if (postId) {
        await http.put(`/api/posts/${postId}`, {
          title,
          excerpt,
          body,
          tags,
          coverImage,
          status: 'published',
        })
      } else {
        await http.post('/api/posts', {
          title,
          excerpt,
          body,
          tags,
          coverImage,
          status: 'published',
        })
      }
      navigate('/posts')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('postEditor.publishFailed', {}, { defaultValue: 'Publish failed' }),
      )
    } finally {
      setLoading(false)
    }
  }
  async function handleSaveDraft() {
    setLoading(true)
    setError(null)
    try {
      if (postId) {
        await http.put(`/api/posts/${postId}`, { title, excerpt, body, tags, status: 'draft' })
      } else {
        const res = await http.post('/api/posts', {
          title,
          excerpt,
          body,
          tags,
          status: 'draft',
          coverImage,
        })
        const payload =
          res && typeof res === 'object' ? (res as { data?: { id?: string }; id?: string }) : null
        const newId = payload?.data?.id ?? payload?.id
        if (newId) setPostId(newId)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('postEditor.saveFailed', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setLoading(false)
    }
  }
  async function handleAISummarize() {
    if (!postId) {
      setError(t('postEditor.saveFirstForAI', {}, { defaultValue: 'Save draft first to use AI' }))
      return
    }
    setLoading(true)
    try {
      const res = await http.post(`/api/posts/${postId}/summarize`)
      const data =
        res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : res
      if (data && typeof data === 'object') {
        const d = data as { excerpt?: string; content?: string }
        if (d.excerpt) setExcerpt(d.excerpt)
        if (d.content) setBody(d.content)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('postEditor.aiFailed', {}, { defaultValue: 'AI summarization failed' }),
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <PostEditorTopNavBar
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
        loading={loading}
      />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.sp('px', 6),
          'pt-32 pb-48',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[680px]', cm.stack(10))}>
          <PostEditorCoverImage image={coverImage} onImageChange={setCoverImage} />
          <PostEditorHeader
            title={title}
            setTitle={setTitle}
            excerpt={excerpt}
            setExcerpt={setExcerpt}
          />
          <PostEditorBody setBody={setBody} value={body} />
          <PostEditorTagsSection tags={tags} setTags={setTags} />
        </div>
      </main>
      {error && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'fixed bottom-24 left-1/2 -translate-x-1/2 bg-error text-on-error rounded-lg z-50',
          )}
        >
          <span>{error}</span>
          <button
            type="button"
            aria-label={t('postEditor.dismissError', {}, { defaultValue: 'Dismiss' })}
            onClick={() => setError(null)}
            className={cm.cn(cm.fontWeight('bold'), 'leading-none')}
          >
            {t('common.close', {}, { defaultValue: '×' })}
          </button>
        </div>
      )}
      {/* AI Floating Action */}
      <PostEditorAIButton onClick={handleAISummarize} disabled={loading} />
      {/* Footer Shell */}
      <PostEditorFooter body={body} />
    </>
  )
}

export default PostEditor
export { PostEditor, PostEditor as PostEditorPage }

import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'
interface PostListItemProps {
  id?: string
  title?: string
  status?: string
  excerpt?: string
  views?: number | string
  comments?: number | string
  date?: string
  onDelete?: (id: string) => void
}
export default function PostListItem({
  id = '',
  title = '',
  status = '',
  excerpt = '',
  views,
  comments,
  date = '',
  onDelete,
}: PostListItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [isDeleted, setIsDeleted] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!id) return
    setDeleteError(null)
    try {
      await http.delete(`/api/posts/${id}`)
      setIsDeleted(true)
      void track({ name: 'post.deleted', properties: { postId: id, status } })
      onDelete?.(id)
    } catch (error) {
      // Surface the failure inline instead of silently keeping the row.
      setDeleteError(
        t('postListItem.deleteFailed', {}, { defaultValue: 'Delete failed — try again.' }),
      )
      console.error('Failed to delete post:', error)
    }
  }

  if (isDeleted) return null

  const openPost = (e: { target: EventTarget | null }) => {
    if (!id) return
    // Clicks/keys originating in the actions cluster must not navigate the row.
    if (e.target instanceof Element && e.target.closest('[data-post-actions]')) return
    navigate(`/posts/${id}/edit`)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPost}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPost(e)
        }
      }}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('py', 5),
        cm.sp('px', 2),
        'group relative border-b border-outline-variant/15 hover:bg-surface-container-low/40 transition-colors',
      )}
      style={{ cursor: id ? 'pointer' : 'default' }}
    >
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 1))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-on-surface hover:text-primary-container transition-colors',
            )}
          >
            {title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
          </h2>
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.fontWeight('bold'),
              'py-0.5 text-[10px] uppercase tracking-wider rounded',
              String(status).toLowerCase() === 'draft'
                ? 'bg-surface-variant/50 text-on-surface-variant'
                : String(status).toLowerCase() === 'scheduled'
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                  : 'bg-secondary-container/30 text-on-secondary-container',
            )}
          >
            {!status
              ? ''
              : String(status).toLowerCase() === 'draft'
                ? t('postListItem.statusDraft', {}, { defaultValue: 'Draft' })
                : String(status).toLowerCase() === 'scheduled'
                  ? t('postListItem.statusScheduled', {}, { defaultValue: 'Scheduled' })
                  : t('status.published', {}, { defaultValue: 'Published' })}
          </span>
        </div>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 3),
            'text-on-surface-variant leading-relaxed line-clamp-2',
          )}
        >
          {excerpt}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant/70',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              visibility
            </span>
            {views ?? 0}
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              chat_bubble
            </span>
            {comments ?? 0}
          </span>
          <span className={cm.fvaa989b70}>
            {t('postListItem.separator', {}, { defaultValue: '•' })}
          </span>
          <span>
            {String(status).toLowerCase() === 'scheduled' && date
              ? t('postListItem.scheduledDate', { date }, { defaultValue: 'Scheduled: {{date}}' })
              : date}
          </span>
        </div>
        {deleteError ? (
          <p role="alert" className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-error')}>
            {deleteError}
          </p>
        ) : null}
      </div>
      <div
        data-post-actions
        className={cm.cn(
          cm.flex({ align: 'start', gap: 'sm' }),
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
        )}
      >
        <Link
          aria-label={t('common.edit', {}, { defaultValue: 'Edit' })}
          className={cm.cn(
            cm.sp('p', 2),
            cm.textPrimary,
            cm.roundedFull,
            'hover:bg-primary-container/10 transition-colors',
          )}
          to={id ? `/posts/${id}/edit` : '/posts/new'}
        >
          <span className={cm.fv5b245ffa}>edit</span>
        </Link>
        <ConfirmButton
          data-mol-id="post-delete-confirm"
          label={t('common.delete', {}, { defaultValue: 'Delete' })}
          confirmLabel={t('postListItem.deleteYes', {}, { defaultValue: 'Yes, delete' })}
          pendingLabel={t('postListItem.deleting', {}, { defaultValue: 'Deleting…' })}
          onConfirm={handleDelete}
          disabled={!id}
          size="sm"
        />
      </div>
    </div>
  )
}
export { PostListItem }

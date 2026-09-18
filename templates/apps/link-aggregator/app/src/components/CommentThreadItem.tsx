/**
 * Nested comment with depth-cycling indent border, collapse toggle,
 * tabular-nums karma, and per-comment vote cluster.
 *
 * Translated from blog/CommentItem*.tsx — adapted to support arbitrary
 * nesting depth and Digest's color-cycling indent rule from DESIGN.md.
 */
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { timeAgo } from './LinkPostCard.js'
import { VoteCluster, type VoteDirection } from './VoteCluster.js'

export interface CommentNode {
  id: string
  body: string
  author_id: string
  author_name?: string
  author_karma?: number
  parent_id: string | null
  points: number
  user_vote?: VoteDirection
  created_at: string
  children?: CommentNode[]
}

export interface CommentThreadItemProps {
  comment: CommentNode
  depth?: number
  onVote?: (id: string, next: VoteDirection) => void
  onReply?: (parentId: string) => void
}

const INDENT_COLORS = ['#6d28d9', '#ea580c', '#0d9488', '#d97706', '#6366f1']

export function CommentThreadItem({ comment, depth = 0, onVote, onReply }: CommentThreadItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const indentColor = INDENT_COLORS[depth % INDENT_COLORS.length]
  const childCount = comment.children?.length ?? 0

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }))}
      style={{
        marginLeft: depth === 0 ? 0 : 24,
        borderLeft: depth === 0 ? 'none' : `2px solid ${indentColor}`,
        paddingLeft: depth === 0 ? 0 : 16,
      }}
    >
      <article
        className={cm.cn(
          cm.flex({ gap: 'sm' }),
          cm.sp('p', 3),
          'rounded-lg hover:bg-primary/5 transition-colors',
        )}
      >
        <VoteCluster
          score={comment.points}
          direction={comment.user_vote ?? null}
          size="sm"
          onVote={(next) => onVote?.(comment.id, next)}
        />
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
          <header
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              'flex-wrap text-on-surface-variant',
            )}
          >
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-mono text-outline hover:text-primary transition-colors',
              )}
              aria-label={
                collapsed
                  ? t('commentThreadItem.expand', {}, { defaultValue: 'Expand' })
                  : t('commentThreadItem.collapse', {}, { defaultValue: 'Collapse' })
              }
            >
              {collapsed ? '[+]' : '[–]'}
            </button>
            <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {comment.author_name || comment.author_id}
            </span>
            {typeof comment.author_karma === 'number' && (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  'py-0.5 bg-[color:var(--color-karma-light)] text-[color:var(--color-karma)] tabular-nums',
                )}
              >
                {t(
                  'commentThreadItem.karma',
                  { karma: comment.author_karma },
                  { defaultValue: '{{karma}} karma' },
                )}
              </span>
            )}
            <span className="text-outline">·</span>
            <time dateTime={comment.created_at}>{timeAgo(comment.created_at)}</time>
            {collapsed && childCount > 0 && (
              <>
                <span className="text-outline">·</span>
                <span className="italic">
                  {t(
                    'commentThreadItem.childCount',
                    { count: childCount },
                    { defaultValue: '{{count}} replies hidden' },
                  )}
                </span>
              </>
            )}
          </header>
          {!collapsed && (
            <>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface leading-relaxed whitespace-pre-wrap break-words',
                )}
              >
                {comment.body}
              </p>
              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(comment.id)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-primary transition-colors w-fit',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'}>reply</span>
                  {t('common.reply', {}, { defaultValue: 'Reply' })}
                </button>
              )}
            </>
          )}
        </div>
      </article>
      {!collapsed &&
        comment.children?.map((child) => (
          <CommentThreadItem
            key={child.id}
            comment={child}
            depth={depth + 1}
            onVote={onVote}
            onReply={onReply}
          />
        ))}
    </div>
  )
}

export default CommentThreadItem

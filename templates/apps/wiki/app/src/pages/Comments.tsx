import { Fragment, type ReactNode, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill } from '../components/StatPill.js'

/**
 * Render `text` with each occurrence of `term` wrapped in a `<mark>`, using React
 * elements (which React auto-escapes) — NOT `dangerouslySetInnerHTML`. A user-authored
 * excerpt must never be dropped into the DOM as raw HTML: doing so with an unescaped
 * `.replace(...)` is stored XSS the moment real comment data is wired in. This is safe
 * by construction because `seg` and `term` are rendered as text children.
 */
function highlightExcerpt(text: string, term: string, markClassName: string): ReactNode {
  if (!term) return text
  return text.split(term).map((seg, i) => (
    <Fragment key={i}>
      {i > 0 && <mark className={markClassName}>{term}</mark>}
      {seg}
    </Fragment>
  ))
}

interface CommentThread {
  id: string
  pageTitle: string
  pageId: string
  breadcrumb: string[]
  startedBy: string
  startedByInitials: string
  excerpt: string
  replyCount: number
  assignee: string | null
  assigneeInitials: string | null
  unresolvedFor: string
  highlighted: string
}

// TODO: replace with /api/comments/unresolved once backend lands
const THREADS: CommentThread[] = [
  {
    id: 't1',
    pageTitle: 'Architecture overview — 2026',
    pageId: 'arch-overview',
    breadcrumb: ['Engineering', 'Reference'],
    startedBy: 'Mira Khan',
    startedByInitials: 'MK',
    excerpt:
      'Should we call out the queue back-pressure assumption explicitly here? Newer hires miss it.',
    replyCount: 3,
    assignee: 'Alex Lin',
    assigneeInitials: 'AL',
    unresolvedFor: '4 hours',
    highlighted: 'durable queues',
  },
  {
    id: 't2',
    pageTitle: 'Roadmap 2026',
    pageId: 'roadmap',
    breadcrumb: ['Product'],
    startedBy: 'Riya Mehra',
    startedByInitials: 'RM',
    excerpt:
      'The Q3 line is too vague — sales has already been quoted by customers asking for SSO.',
    replyCount: 6,
    assignee: 'Sam Park',
    assigneeInitials: 'SP',
    unresolvedFor: '2 days',
    highlighted: 'enterprise SSO',
  },
  {
    id: 't3',
    pageTitle: 'Launch checklist',
    pageId: 'launch-checklist',
    breadcrumb: ['Product', 'Playbooks'],
    startedBy: 'Jules Vega',
    startedByInitials: 'JV',
    excerpt: 'Move the support-brief step before the dashboard review — they need it earlier.',
    replyCount: 1,
    assignee: null,
    assigneeInitials: null,
    unresolvedFor: '3 days',
    highlighted: 'support brief',
  },
  {
    id: 't4',
    pageTitle: 'Usability Q1 findings',
    pageId: 'usability-q1',
    breadcrumb: ['Research'],
    startedBy: 'Edith Mu',
    startedByInitials: 'EM',
    excerpt:
      '"Calmer than competitors" is great pull-quote — should it move into the exec summary?',
    replyCount: 2,
    assignee: 'Riya Mehra',
    assigneeInitials: 'RM',
    unresolvedFor: '5 days',
    highlighted: 'calmer than competitors',
  },
]

export function Comments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [resolving, setResolving] = useState<string | null>(null)

  const handleResolve = async (id: string) => {
    setResolving(id)
    // TODO: PATCH /api/comments/:threadId/resolve
    await new Promise((r) => setTimeout(r, 400))
    setResolving(null)
  }

  return (
    <div className={cm.stack(8)}>
      <div className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('comments.eyebrow', {}, { defaultValue: 'Workspace conversations' })}
        </span>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('comments.heading', {}, { defaultValue: 'Unresolved threads' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'comments.subtitle',
            {
              count: THREADS.length,
            },
            {
              defaultValue:
                'The {{count}} threads still waiting on a reply or a resolve. Sorted by age — oldest first, so nothing rots.',
            },
          )}
        </p>
      </div>

      <ul className={cm.stack(4)}>
        {THREADS.map((thread) => (
          <li
            key={thread.id}
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:shadow-sm transition-shadow',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'flex-wrap',
              )}
            >
              <div className={cm.stack(1)}>
                <Link
                  to={`/page/${thread.pageId}`}
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface hover:text-primary transition-colors',
                  )}
                >
                  {thread.pageTitle}
                </Link>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {thread.breadcrumb.join(' / ')}
                </p>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <StatPill tone="draft" icon="schedule">
                  {t(
                    'comments.openFor',
                    { age: thread.unresolvedFor },
                    { defaultValue: 'Open {{age}}' },
                  )}
                </StatPill>
                {thread.assignee ? (
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-6 w-6 rounded-full bg-secondary/15 text-secondary font-semibold',
                      )}
                      aria-hidden="true"
                    >
                      {thread.assigneeInitials}
                    </span>
                    {thread.assignee}
                  </span>
                ) : (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-full border border-dashed border-outline-variant text-on-surface-variant',
                    )}
                  >
                    {t('status.unassigned', {}, { defaultValue: 'Unassigned' })}
                  </span>
                )}
              </div>
            </div>

            <blockquote
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg border-l-[3px] border-secondary bg-secondary-light/40 text-on-surface italic',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
                <span className={cm.cn('font-semibold not-italic')}>{thread.startedBy}: </span>
                <span>
                  {highlightExcerpt(
                    thread.excerpt,
                    thread.highlighted,
                    cm.cn('rounded bg-secondary/30 px-1 not-italic font-semibold text-on-surface'),
                  )}
                </span>
              </p>
            </blockquote>

            <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'comments.replyCount',
                  { count: thread.replyCount },
                  { defaultValue: '{{count}} replies' },
                )}
              </span>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <Link
                  to={`/page/${thread.pageId}#thread-${thread.id}`}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'h-9 inline-flex items-center rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors',
                  )}
                >
                  {t('comments.openThread', {}, { defaultValue: 'Open thread' })}
                </Link>
                <button
                  type="button"
                  onClick={() => handleResolve(thread.id)}
                  disabled={resolving === thread.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'h-9 rounded-md bg-success text-on-primary hover:bg-success-hover disabled:opacity-60 transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    {resolving === thread.id ? 'progress_activity' : 'check'}
                  </span>
                  {resolving === thread.id
                    ? t('comments.resolving', {}, { defaultValue: 'Resolving…' })
                    : t('comments.resolve', {}, { defaultValue: 'Resolve' })}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

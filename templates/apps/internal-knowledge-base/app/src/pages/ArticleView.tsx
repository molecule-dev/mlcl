import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { t as translate } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type CairnArticleStatus,
  CairnArticleStatusPill,
} from '../components/CairnArticleStatusPill.js'
import { SafeHtml } from '../components/SafeHtml.js'
import { extractExcerpt, extractToc, renderMarkdown } from '../lib/markdown.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ArticleDetail {
  id: string
  title: string
  excerpt?: string
  body_md?: string
  body_html: string
  space_name: string
  space_key: string
  section_path?: string[]
  author_name: string
  author_initials: string
  author_role?: string
  status: CairnArticleStatus
  updated_at: string
  read_minutes?: number
  toc?: { id: string; label: string; level: 1 | 2 | 3 }[]
}

const DEMO_ARTICLE: ArticleDetail = {
  id: 'oncall-rotation',
  title: 'On-call rotation: rules of engagement',
  excerpt:
    'How we run the rotation, what counts as paged, when to escalate, and how we keep the on-call humane.',
  space_name: 'Engineering',
  space_key: 'engineering',
  section_path: ['Runbooks', 'On-call'],
  author_name: 'Maya Patel',
  author_initials: 'MP',
  author_role: 'Senior Operations Engineer',
  status: 'published',
  updated_at: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
  read_minutes: 8,
  toc: [
    { id: 'overview', label: 'Overview', level: 1 },
    { id: 'rotation', label: 'The weekly rotation', level: 2 },
    { id: 'paged', label: 'What counts as a page', level: 2 },
    { id: 'escalation', label: 'Escalation', level: 2 },
    { id: 'humane', label: 'Keeping it humane', level: 2 },
    { id: 'open-questions', label: 'Open questions', level: 1 },
  ],
  body_html: `
    <p><em>The on-call rotation is the team's promise to itself: when something breaks at 2am, exactly one person owns the page, the response, and the comms — and everyone else gets to sleep.</em> This article describes how we run the rotation, what we expect of on-callers, and the cultural rails we put around the role to keep it from grinding people down.</p>
    <h2 id="overview">Overview</h2>
    <p>We run a one-week rotation, primary + secondary, with a 12-hour internal handoff at noon Pacific. The pager rotates through the platform engineers; ICs and managers both take turns. The shift starts on Tuesday — Mondays are too jet-lagged after weekends.</p>
    <h2 id="rotation">The weekly rotation</h2>
    <p>The schedule is generated four weeks ahead. PagerDuty owns the source of truth; the calendar is mirrored from PagerDuty automatically.</p>
    <ul>
      <li><strong>Primary</strong> — owns every page, runs the incident if one is declared, writes the comms.</li>
      <li><strong>Secondary</strong> — backstops if primary is asleep / on a flight. Otherwise hands-off.</li>
      <li><strong>IC of the week</strong> — declared when an incident is upgraded past Sev-3.</li>
    </ul>
    <h2 id="paged">What counts as a page</h2>
    <p>Pages are precious. We page only when (a) the page reflects user-visible degradation, or (b) silence will cause user-visible degradation within an hour. Everything else goes to a slow channel and gets handled at the next standup. The page-or-don't decision is in the runbooks for each system.</p>
    <h2 id="escalation">Escalation</h2>
    <p>If the on-caller is stuck after 15 minutes, escalate. There's no badge of honor for solo'ing a complicated incident. Common escalation paths:</p>
    <ol>
      <li>Page the secondary.</li>
      <li>Page the on-call manager.</li>
      <li>Open the war-room channel and @here the platform team.</li>
    </ol>
    <h2 id="humane">Keeping it humane</h2>
    <p>The on-call is supposed to feel like work, not like punishment. We do three things to make it sustainable:</p>
    <ul>
      <li><strong>Comp time</strong> — every off-hours page earns 30 minutes of comp time, taken at the on-caller's discretion.</li>
      <li><strong>No-meeting Wednesdays</strong> — the on-caller's calendar gets cleared mid-week so they can chase the longer-tail issues.</li>
      <li><strong>Postmortem-first culture</strong> — every Sev-2-or-worse gets a postmortem, owned by the IC, blameless. We share them in the engineering channel and add the unique-failure lesson to the runbook.</li>
    </ul>
    <h2 id="open-questions">Open questions</h2>
    <p>Two things we're still iterating on:</p>
    <ol>
      <li>Whether to bring support engineers into the rotation as a third tier.</li>
      <li>Whether the 12-hour midday handoff should slip to a true 24-hour rotation as the team grows past the EU horizon.</li>
    </ol>
    <p><em>Comments welcome — open a thread on the article and tag @platform-team.</em></p>
  `,
}

function fmtRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return translate('common.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24)
    return translate('time.hoursAgo', { count: diffH }, { defaultValue: '{{count}}h ago' })
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)
    return translate('time.daysAgo', { count: diffD }, { defaultValue: '{{count}}d ago' })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ArticleView() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  // Demo data is kept only as a compile-time shape reference — the page
  // renders exclusively real API data (loading → article | not-found).
  void DEMO_ARTICLE
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState(false)
  const [togglingBookmark, setTogglingBookmark] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setLoading(true)
    setArticle(null)
    http
      .get(`/articles/${id}`)
      .then((res) => {
        if (cancelled) return
        const apiArticle = unwrapSingle<ArticleDetail>(res)
        if (apiArticle) {
          // Backfill view-only fields from body_md when the API row didn't
          // populate them at write time (typical for editor-saved articles).
          const normalized: ArticleDetail = {
            ...apiArticle,
            body_html: apiArticle.body_html?.length
              ? apiArticle.body_html
              : renderMarkdown(apiArticle.body_md ?? ''),
            excerpt: apiArticle.excerpt ?? extractExcerpt(apiArticle.body_md ?? ''),
            toc: apiArticle.toc ?? extractToc(apiArticle.body_md ?? ''),
            space_name: apiArticle.space_name ?? '',
            space_key: apiArticle.space_key ?? '',
            author_name: apiArticle.author_name ?? '',
            author_initials: apiArticle.author_initials ?? '',
          }
          setArticle(normalized)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    // Hydrate bookmark state for THIS article from the bookmark resource.
    http
      .get(`/bookmarks/check/article/${id}`)
      .then((res) => {
        if (cancelled) return
        const data =
          (res as { data?: { bookmarked?: boolean } })?.data ?? (res as { bookmarked?: boolean })
        setBookmarked(Boolean(data?.bookmarked))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, id])

  async function handleBookmarkToggle() {
    if (!id || togglingBookmark) return
    setTogglingBookmark(true)
    try {
      if (bookmarked) {
        await http.delete(`/bookmarks/article/${id}`)
        setBookmarked(false)
      } else {
        await http.post('/bookmarks', { resourceType: 'article', resourceId: id })
        setBookmarked(true)
      }
    } catch (_error) {
      // Best-effort UI; user can retry by tapping the bookmark button again
    } finally {
      setTogglingBookmark(false)
    }
  }

  if (loading && !article) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        {t('articleView.loading', {}, { defaultValue: 'Opening this article…' })}
      </div>
    )
  }

  if (!article) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          'text-center text-on-surface-variant space-y-4',
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'text-on-surface')}>
          {t('article.notFound', {}, { defaultValue: 'Article not found' })}
        </p>
        <p>
          {t(
            'articleView.notFoundBody',
            {},
            { defaultValue: 'This article does not exist (or you do not have access).' },
          )}
        </p>
        <Link
          to="/spaces"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('spaceHome.backToSpaces', {}, { defaultValue: '← Back to spaces' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <article
          className={cm.cn('col-span-12 lg:col-span-9 mx-auto w-full max-w-[720px] space-y-6')}
        >
          <nav className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            <Link to="/spaces" className={cm.cn('hover:text-on-surface')}>
              {t('articleView.spaces', {}, { defaultValue: 'Spaces' })}
            </Link>
            <span className={cm.cn(cm.sp('px', 2))}>{'\u203a'}</span>
            <Link to={`/spaces/${article.space_key}`} className={cm.cn('hover:text-on-surface')}>
              {article.space_name}
            </Link>
            {article.section_path?.map((s, i) => (
              <span key={i}>
                <span className={cm.cn(cm.sp('px', 2))}>{'\u203a'}</span>
                <span>{s}</span>
              </span>
            ))}
          </nav>

          <header className={cm.cn('space-y-4')}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <CairnArticleStatusPill status={article.status} size="md" />
              {article.read_minutes ? (
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'articleView.readTime',
                    { minutes: article.read_minutes },
                    { defaultValue: '{{minutes}} min read' },
                  )}
                </span>
              ) : null}
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {'\u00b7 '}
                {t(
                  'articleView.updated',
                  { when: fmtRelative(article.updated_at) },
                  { defaultValue: 'updated {{when}}' },
                )}
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight leading-[1.1] text-on-surface',
              )}
            >
              {article.title}
            </h1>
            <p
              className={cm.cn(cm.textSize('xl'), 'italic leading-relaxed text-on-surface-variant')}
              style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
            >
              {article.excerpt}
            </p>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 rounded-full text-sm font-extrabold text-white shadow-sm',
                )}
                style={{ backgroundColor: 'var(--mol-color-primary)' }}
                aria-hidden="true"
              >
                {article.author_initials}
              </span>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('extrabold'),
                    'text-on-surface',
                  )}
                >
                  {article.author_name}
                </p>
                {article.author_role ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {article.author_role}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleBookmarkToggle}
                disabled={togglingBookmark}
                aria-pressed={bookmarked}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'ml-auto rounded-full border text-on-surface transition-colors disabled:opacity-50',
                  bookmarked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline hover:bg-surface-container',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined')}
                  aria-hidden="true"
                  style={{ fontSize: '1rem' }}
                >
                  {bookmarked ? 'bookmark' : 'bookmark_border'}
                </span>
                {bookmarked
                  ? t('articleView.bookmarkOn', {}, { defaultValue: 'Bookmarked' })
                  : t('articleView.bookmarkOff', {}, { defaultValue: 'Bookmark' })}
              </button>
              <Link
                to={`/article/${article.id}/edit`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full border border-outline text-on-surface hover:bg-surface-container',
                )}
              >
                {t('articleView.edit', {}, { defaultValue: 'Edit article' })}
              </Link>
            </div>
          </header>

          <SafeHtml
            html={article.body_html}
            className={cm.cn(
              'prose prose-lg max-w-none text-on-surface',
              'prose-headings:text-on-surface prose-headings:font-extrabold prose-headings:tracking-tight',
              'prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl',
              'prose-p:leading-[1.75] prose-p:text-on-surface',
              'prose-li:text-on-surface prose-strong:text-on-surface',
              'prose-em:text-on-surface-variant',
              'prose-a:text-primary',
            )}
            style={{ fontFamily: 'Georgia, "Iowan Old Style", serif', fontSize: '1.0625rem' }}
          />
        </article>

        {article.toc && article.toc.length > 0 ? (
          <aside className={cm.cn('col-span-12 lg:col-span-3 lg:sticky lg:top-8 lg:self-start')}>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
              )}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('extrabold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('articleView.tocHeading', {}, { defaultValue: 'On this page' })}
              </p>
              <ul className={cm.cn(cm.sp('mt', 3), 'space-y-1 border-l-2 border-outline-variant')}>
                {article.toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={cm.cn(
                        cm.textSize('sm'),
                        'block py-1 pl-3 -ml-px border-l-2 border-transparent text-on-surface-variant transition-colors hover:border-primary hover:text-primary',
                        item.level === 2 ? 'pl-6' : '',
                        item.level === 3 ? 'pl-9' : '',
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

export default ArticleView

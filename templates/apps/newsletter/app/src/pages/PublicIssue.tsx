import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

interface Issue {
  id: string
  subject?: string
  preview_text?: string | null
  body_md?: string
  status?: string
  publish_at?: string | null
}

/**
 * PublicIssue — the rendered issue at /issues/:id, the "subscriber's copy".
 * When the URL carries ?t=<subscriber token> (the demo stand-in for a real
 * ESP's per-recipient link), the page pings the open-tracking endpoint once
 * and renders the unsubscribe link with the same token — exactly the two
 * actions a real newsletter embeds. No real email client is involved; this
 * page IS the inbox for the purposes of the demo.
 */
function PublicIssue() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t') ?? ''
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setNotFound(false)
    fetch(`/api/issues/${id}`)
      .then((r) => {
        if (r.status === 404) throw new Error('not-found')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Issue>
      })
      .then((body) => {
        if (active) setIssue(body)
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  // Demo open tracking: one ping per tokened visit. Server-side it stamps
  // sends.opened_at (first time only) and bumps the issue's opened counter.
  useEffect(() => {
    if (!id || !token) return
    void fetch(`/api/issues/${id}/open/${encodeURIComponent(token)}`).catch(() => undefined)
  }, [id, token])

  useEffect(() => {
    if (issue?.subject) document.title = `${issue.subject} · ${APP_NAME}`
  }, [issue])

  const sections = (issue?.body_md ?? '')
    .split(/\n\n+/g)
    .map((p) => p.trim())
    .filter(Boolean)

  if (loading) {
    return (
      <main className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.minH('screen'))}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading...' })}
        </p>
      </main>
    )
  }

  if (notFound || !issue) {
    return (
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.minH('screen'),
          cm.stack(6),
        )}
      >
        <p className={cm.cn(cm.textSize('xl'), "font-['Newsreader'] text-on-background")}>
          {t(
            'publicIssue.notFound',
            {},
            { defaultValue: 'This issue does not exist (or is still a draft).' },
          )}
        </p>
        <SafeLink to="/" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('publicIssue.backHome', {}, { defaultValue: 'Back to the publication' })}
        </SafeLink>
      </main>
    )
  }

  return (
    <main aria-label={issue.subject ?? APP_NAME} className={cm.cn('pt-24 pb-24 px-6')}>
      <article
        data-mol-id="public-issue"
        className={cm.cn('max-w-[680px] mx-auto', 'prose-editorial')}
      >
        <header className={cm.cn(cm.sp('mb', 10))}>
          <SafeLink
            to="/"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-[var(--color-status-published)] hover:underline',
            )}
          >
            {APP_NAME}
          </SafeLink>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 4),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {issue.publish_at
              ? new Date(issue.publish_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : ''}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              'font-black',
              "font-['Newsreader'] text-on-background mt-2",
            )}
          >
            {issue.subject}
          </h1>
          {issue.preview_text && (
            <p
              className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'italic text-on-surface-variant')}
            >
              {issue.preview_text}
            </p>
          )}
        </header>
        {sections.map((p, i) =>
          p.startsWith('## ') ? (
            <h2
              key={i}
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                "font-['Newsreader'] text-on-surface mt-8 mb-4",
              )}
            >
              {p.slice(3)}
            </h2>
          ) : p.startsWith('- ') ? (
            <ul key={i} className="list-disc pl-6">
              {p.split('\n').map((li, j) => (
                <li key={j} className={cm.textSize('base')}>
                  {li.replace(/^- /, '')}
                </li>
              ))}
            </ul>
          ) : (
            <p key={i} className={cm.textSize('base')}>
              {p}
            </p>
          ),
        )}
        {/* The unsubscribe footer a real newsletter carries. The token makes
            it subscriber-specific; the issue id lets the API record the click
            on this issue's send before flipping the status. */}
        <footer className={cm.cn(cm.sp('mt', 12), 'pt-6 border-t border-outline-variant')}>
          {token ? (
            <SafeLink
              to={`/unsubscribe/${encodeURIComponent(token)}?issue=${encodeURIComponent(issue.id)}`}
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant hover:text-error underline',
              )}
            >
              {t(
                'publicIssue.unsubscribe',
                {},
                { defaultValue: 'Unsubscribe from this newsletter' },
              )}
            </SafeLink>
          ) : (
            <SafeLink
              to="/"
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant hover:text-primary underline',
              )}
            >
              {t('publicIssue.subscribe', {}, { defaultValue: 'Subscribe to this newsletter' })}
            </SafeLink>
          )}
        </footer>
      </article>
    </main>
  )
}

export default PublicIssue
export { PublicIssue, PublicIssue as PublicIssuePage }

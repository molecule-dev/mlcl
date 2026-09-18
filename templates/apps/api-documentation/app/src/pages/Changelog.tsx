import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

type ChangeKind = 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed'

interface ChangelogEntry {
  text: string
  // The seeded changelog rows store the change category as either
  // `kind` (newer rows) or `type` (legacy/CI seed). Tolerate both so a
  // pre-existing seed never renders as a blank tag.
  kind?: ChangeKind
  type?: ChangeKind
}

interface Release {
  version: string
  released_at: string
  entries: ChangelogEntry[]
}

const KIND_COLOR: Record<ChangeKind, string> = {
  added: 'bg-success/15 text-success',
  changed: 'bg-info/15 text-info',
  deprecated: 'bg-warning/15 text-warning',
  removed: 'bg-error/15 text-error',
  fixed: 'bg-secondary/15 text-secondary',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Changelog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/changelog')
      .then((res) => {
        if (!cancelled) setReleases(unwrapList<Release>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('changelog.loadError', {}, { defaultValue: 'Failed to load changelog.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t('changelog.eyebrow', {}, { defaultValue: 'RELEASE_NOTES' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('changelog.heading', {}, { defaultValue: 'Changelog' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'changelog.subheading',
            { appName: APP_NAME },
            { defaultValue: 'Versioned release notes for the {{appName}} API.' },
          )}
        </p>
        {!loading && !error && releases.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider font-mono',
              )}
            >
              {t(
                'changelog.releasesCount',
                { count: releases.length },
                { defaultValue: '{{count}} releases' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-success-light/15 text-emerald-400 uppercase tracking-wider font-mono',
              )}
            >
              {t(
                'changelog.latest',
                { version: releases[0]?.version ?? '0.0.0' },
                { defaultValue: 'latest v{{version}}' },
              )}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : releases.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('changelog.empty', {}, { defaultValue: 'No releases yet.' })}
        </p>
      ) : (
        <ol className={cm.cn('space-y-6')}>
          {releases.map((r, idx) => (
            <li
              id={r.version}
              key={`${r.version}-${idx}`}
              className={cm.cn(cm.card(), cm.sp('p', 6))}
            >
              <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
                <a
                  href={`#${r.version}`}
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-mono')}
                >
                  v{r.version}
                </a>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {fmtDate(r.released_at)}
                </span>
              </header>
              <ul className={cm.cn('space-y-2')}>
                {r.entries.map((e, i) => {
                  const kind = (e.kind ?? e.type ?? 'changed') as ChangeKind
                  return (
                    <li key={i} className={cm.flex({ align: 'start', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          'uppercase shrink-0',
                          KIND_COLOR[kind],
                        )}
                      >
                        {kind}
                      </span>
                      <p className={cm.cn(cm.textSize('sm'))}>{e.text}</p>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

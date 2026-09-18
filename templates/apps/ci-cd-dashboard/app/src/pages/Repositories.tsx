import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Repository {
  id: string
  slug: string
  name: string
  default_branch: string
  language: string
  last_build_status: 'success' | 'failed' | 'running' | 'queued'
  last_build_at: string
  recent_build_durations: number[]
}

const STATUS_BADGE: Record<Repository['last_build_status'], string> = {
  success: 'bg-success/10 text-success',
  failed: 'bg-error/10 text-error',
  running: 'bg-info/10 text-info',
  queued: 'bg-warning/10 text-warning',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <span className={'inline-flex items-end gap-px h-4'}>
      {values.map((v, i) => (
        <span
          key={i}
          className={'w-1 bg-primary rounded-sm'}
          style={{ height: `${Math.max(2, Math.round((v / max) * 16))}px` }}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

export function Repositories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/repositories')
      .then((res) => {
        if (!cancelled) setRepos(unwrapList<Repository>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('repositories.loadError', {}, { defaultValue: 'Failed to load repositories.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('repositories.heading', {}, { defaultValue: 'Repositories' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : repos.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('repositories.empty', {}, { defaultValue: 'No repositories connected.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {repos.map((r) => (
            <li key={r.id}>
              <Link
                to={`/repositories/${r.slug}`}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'block bg-surface rounded-md border border-outline-variant hover:border-primary transition-colors',
                )}
              >
                <div className={'flex-1 min-w-0'}>
                  <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>{r.name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {r.language} · {r.default_branch}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'font-mono uppercase rounded-full',
                    STATUS_BADGE[r.last_build_status],
                  )}
                >
                  {r.last_build_status}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                  {fmtRelative(r.last_build_at)}
                </span>
                <Sparkline values={r.recent_build_durations} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

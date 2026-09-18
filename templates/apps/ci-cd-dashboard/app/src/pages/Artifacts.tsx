import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Artifact {
  id: string
  name: string
  pipeline_id: string
  pipeline_name: string
  size_bytes: number
  type: 'docker' | 'tarball' | 'binary' | 'sourcemap' | 'sbom' | 'log'
  retention_days: number
  created_at: string
  download_url: string
}

const TYPE_ICON: Record<Artifact['type'], string> = {
  docker: 'inventory_2',
  tarball: 'archive',
  binary: 'memory',
  sourcemap: 'description',
  sbom: 'list',
  log: 'receipt_long',
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function Artifacts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/artifacts')
      .then((res) => {
        if (!cancelled) setArtifacts(unwrapList<Artifact>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('artifacts.loadError', {}, { defaultValue: 'Failed to load artifacts.' }))
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
        {t('artifacts.heading', {}, { defaultValue: 'Artifacts' })}
      </h1>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : artifacts.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('artifacts.empty', {}, { defaultValue: 'No artifacts yet.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {artifacts.map((a) => (
            <li
              key={a.id}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ align: 'center', gap: 'md' }),
                'bg-surface rounded-md border border-outline-variant',
              )}
            >
              <span
                className={'material-symbols-outlined text-2xl text-primary flex-shrink-0'}
                aria-hidden="true"
              >
                {TYPE_ICON[a.type]}
              </span>
              <div className={'flex-1 min-w-0'}>
                <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>{a.name}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {a.pipeline_name} · {fmtRelative(a.created_at)}
                </p>
              </div>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'font-mono uppercase rounded-full bg-surface-container text-on-surface-variant',
                )}
              >
                {a.type}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                {fmtSize(a.size_bytes)}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                {t(
                  'artifacts.retention',
                  { days: a.retention_days },
                  { defaultValue: '{{days}}d retention' },
                )}
              </span>
              <a
                href={a.download_url}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'border border-outline rounded-md hover:bg-surface-container',
                )}
              >
                {t('common.download', {}, { defaultValue: 'Download' })}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

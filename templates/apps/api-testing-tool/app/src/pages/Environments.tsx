import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  EnvironmentCard,
  type EnvironmentData,
  type EnvironmentTone,
  type EnvironmentVariable,
} from '../components/EnvironmentCard.js'

interface EnvRow {
  id: string
  name?: string
  is_active?: boolean
  variables?: unknown
}

const SECRET_HINT_RE = /(token|secret|password|key)/i

function toneFromName(name: string): EnvironmentTone {
  const n = name.toLowerCase()
  if (n.includes('prod')) return 'production'
  if (n.includes('stag')) return 'staging'
  if (n.includes('local') || n.includes('dev')) return 'local'
  return 'preview'
}

function baseUrlFromVars(vars: EnvironmentVariable[]): string {
  const found = vars.find(
    (v) => v.key.toLowerCase().includes('base_url') || v.key.toLowerCase() === 'baseurl',
  )
  return found?.value ?? ''
}

function normaliseVariables(input: unknown): EnvironmentVariable[] {
  if (!Array.isArray(input)) return []
  const out: EnvironmentVariable[] = []
  for (const entry of input) {
    if (entry && typeof entry === 'object') {
      const key = String((entry as { key?: unknown }).key ?? '')
      const value = String((entry as { value?: unknown }).value ?? '')
      if (!key) continue
      out.push({
        key,
        value,
        secret: SECRET_HINT_RE.test(key),
      })
    }
  }
  return out
}

export function Environments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [environments, setEnvironments] = useState<EnvironmentData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      const res = await http.get<EnvRow[]>('/api/environments')
      const rows = Array.isArray(res.data) ? res.data : []
      const data: EnvironmentData[] = rows.map((row) => {
        const vars = normaliseVariables(row.variables)
        return {
          id: row.id,
          name: row.name ?? '',
          base_url: baseUrlFromVars(vars),
          tone: toneFromName(row.name ?? ''),
          is_active: row.is_active ?? false,
          variables: vars,
        }
      })
      setEnvironments(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('environments.fetchError', {}, { defaultValue: 'Could not load environments.' }),
      )
      setEnvironments([])
    }
  }

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const defaultName = t(
        'environments.defaultName',
        { n: (environments?.length ?? 0) + 1 },
        { defaultValue: 'Untitled environment {{n}}' },
      )
      const created = await http.post<{ id?: string }>('/api/environments', {
        name: defaultName,
        variables: [],
        is_active: false,
      })
      void track({
        name: 'environment.created',
        properties: { environment_id: created.data?.id },
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('environments.createError', {}, { defaultValue: 'Could not create environment.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('environments.eyebrow', {}, { defaultValue: '$ pylon env --switch' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('environments.heading', {}, { defaultValue: 'Environments' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'environments.subheading',
              {},
              {
                defaultValue:
                  'Variables that swap into requests at send time. One active environment per workspace.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={creating}
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-all hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60',
          )}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            boxShadow: '0 8px 22px -10px color-mix(in srgb, var(--color-primary) 60%, transparent)',
          }}
          data-mol-id="environments-new"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('environments.newEnvironment', {}, { defaultValue: 'New environment' })}
        </button>
      </header>

      {environments === null ? (
        <p
          className={cm.cn('text-sm py-8 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('environments.loading', {}, { defaultValue: 'Loading environments…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm py-8 text-center')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : environments.length === 0 ? (
        <div
          className={cm.cn('py-16 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            cloud_off
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'environments.empty',
              {},
              { defaultValue: 'No environments yet — click “New environment” to add one.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-2')}>
          {environments.map((env) => (
            <EnvironmentCard key={env.id} environment={env} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type CollectionRequest,
  type CollectionTreeData,
  CollectionTreeItem,
} from '../components/CollectionTreeItem.js'
import type { HttpMethod } from '../components/MethodBadge.js'
import { MetricStatCard } from '../components/MetricStatCard.js'

interface CollectionRow {
  id: string
  name?: string
  description?: string
  created_at?: string
  updated_at?: string
}

interface RequestRow {
  id: string
  collection_id?: string | null
  name?: string
  method?: string
  url?: string
  updated_at?: string
}

interface HistoryRow {
  id: string
  request_id?: string | null
  status_code?: number
  created_at?: string
}

function pathFromUrl(url: string | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.pathname || url
  } catch (_error) {
    // new URL() throws on relative/invalid URLs — fall back to the raw string
    return url
  }
}

export function Collections() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [collections, setCollections] = useState<CollectionTreeData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      const [colRes, reqRes, histRes] = await Promise.all([
        http.get<CollectionRow[]>('/api/collections'),
        http.get<RequestRow[]>('/api/requests'),
        http
          .get<HistoryRow[]>('/api/history?limit=200')
          .catch(() => ({ data: [] as HistoryRow[] })),
      ])
      const cols = Array.isArray(colRes.data) ? colRes.data : []
      const reqs = Array.isArray(reqRes.data) ? reqRes.data : []
      const hist = Array.isArray(histRes.data) ? histRes.data : []

      // Index latest history per request_id.
      const latest: Record<string, HistoryRow> = {}
      for (const h of hist) {
        const key = h.request_id ?? ''
        if (!key) continue
        if (!latest[key] || (h.created_at ?? '') > (latest[key].created_at ?? '')) {
          latest[key] = h
        }
      }

      const grouped: CollectionTreeData[] = cols.map((col) => {
        const myReqs: CollectionRequest[] = reqs
          .filter((r) => r.collection_id === col.id)
          .map((r) => {
            const last = latest[r.id]
            const lastStatus =
              last == null
                ? null
                : (last.status_code ?? 0) >= 200 && (last.status_code ?? 0) < 400
                  ? ('success' as const)
                  : ('failed' as const)
            return {
              id: r.id,
              method: (r.method ?? 'GET') as HttpMethod,
              path: pathFromUrl(r.url),
              last_run_at: last?.created_at ?? null,
              last_run_status: lastStatus,
            }
          })
        return {
          id: col.id,
          name: col.name ?? '',
          description: col.description,
          requests: myReqs,
        }
      })
      setCollections(grouped)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('collections.fetchError', {}, { defaultValue: 'Could not load collections.' }),
      )
      setCollections([])
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
        'collections.defaultName',
        { n: (collections?.length ?? 0) + 1 },
        { defaultValue: 'Untitled collection {{n}}' },
      )
      const created = await http.post<CollectionRow>('/api/collections', {
        name: defaultName,
        description: '',
      })
      void track({
        name: 'collection.created',
        properties: { collection_id: created.data?.id },
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('collections.createError', {}, { defaultValue: 'Could not create collection.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const totalRequests = collections?.reduce((acc, c) => acc + c.requests.length, 0) ?? 0
  const failing =
    collections?.reduce(
      (acc, c) => acc + c.requests.filter((r) => r.last_run_status === 'failed').length,
      0,
    ) ?? 0
  const fresh =
    collections?.reduce(
      (acc, c) =>
        acc +
        c.requests.filter(
          (r) =>
            r.last_run_at != null &&
            Date.now() - new Date(r.last_run_at).getTime() < 60 * 60 * 1000,
        ).length,
      0,
    ) ?? 0

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('collections.eyebrow', {}, { defaultValue: '$ pylon collections --tree' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('collections.heading', {}, { defaultValue: 'Collections' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'collections.subheading',
              {},
              { defaultValue: 'Group requests, share with your team, and run them as a suite.' },
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
          data-mol-id="collections-new"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('collections.newCollection', {}, { defaultValue: 'New collection' })}
        </button>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricStatCard
          eyebrow={t('collections.metric.collections', {}, { defaultValue: 'Collections' })}
          value={String(collections?.length ?? 0)}
          icon="folder"
          tone="primary"
        />
        <MetricStatCard
          eyebrow={t('collections.metric.requests', {}, { defaultValue: 'Requests' })}
          value={String(totalRequests)}
          icon="route"
          tone="info"
        />
        <MetricStatCard
          eyebrow={t('collections.metric.fresh', {}, { defaultValue: 'Run last hour' })}
          value={String(fresh)}
          icon="bolt"
          tone="accent"
        />
        <MetricStatCard
          eyebrow={t('collections.metric.failing', {}, { defaultValue: 'Failing' })}
          value={String(failing)}
          icon="error"
          tone={failing > 0 ? 'error' : 'neutral'}
          caption={
            failing > 0
              ? t(
                  'collections.metric.failingCaption',
                  {},
                  { defaultValue: 'Last run had failures' },
                )
              : t('collections.metric.allGreen', {}, { defaultValue: 'All green' })
          }
        />
      </section>

      {collections === null ? (
        <p
          className={cm.cn('text-sm py-8 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('collections.loading', {}, { defaultValue: 'Loading collections…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm py-8 text-center')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : collections.length === 0 ? (
        <div
          className={cm.cn('py-16 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            folder_off
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'collections.empty',
              {},
              {
                defaultValue:
                  'No collections yet — click “New collection” to scaffold your first folder.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {collections.map((collection, i) => (
            <li key={collection.id}>
              <CollectionTreeItem collection={collection} defaultOpen={i === 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

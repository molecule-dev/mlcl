import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { fmtRelative } from '../lib/format.js'
import { type HttpMethod, MethodBadge } from './MethodBadge.js'

/**
 * Collapsible collection tree row — folder header with chevron + count
 * pill, expanding into a nested list of request rows. Each request row
 * shows a fixed-width method badge + monospace path + last-run pill.
 *
 * Translated from ci-cd-dashboard's repository tree pattern, restyled
 * to Pylon's terminal aesthetic with the method-coded left rail
 * defined in DESIGN.md.
 */

export interface CollectionRequest {
  id: string
  method: HttpMethod
  path: string
  last_run_at?: string | null
  last_run_status?: 'success' | 'failed' | null
}

export interface CollectionTreeData {
  id: string
  name: string
  description?: string
  requests: CollectionRequest[]
}

interface CollectionTreeItemProps {
  collection: CollectionTreeData
  defaultOpen?: boolean
  onSelect?: (request: CollectionRequest) => void
}

export function CollectionTreeItem({
  collection,
  defaultOpen = false,
  onSelect,
}: CollectionTreeItemProps) {
  const cm = getClassMap()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={cm.cn('rounded-xl overflow-hidden')}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 45%, transparent)',
        border: '1px solid var(--color-border)',
      }}
      data-mol-id={`collection-tree-${collection.id}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cm.cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]',
        )}
        aria-expanded={open}
      >
        <span
          className={cm.cn('material-symbols-outlined text-base transition-transform')}
          style={{
            color: 'var(--color-method-get)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          chevron_right
        </span>
        <span
          className={cm.cn('material-symbols-outlined text-base')}
          style={{ color: open ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}
          aria-hidden="true"
        >
          {open ? 'folder_open' : 'folder'}
        </span>
        <div className={cm.cn('flex-1 min-w-0')}>
          <p
            className={cm.cn('font-mono text-sm font-bold tracking-tight truncate')}
            style={{ color: 'var(--color-text-primary)' }}
          >
            {collection.name}
          </p>
          {collection.description ? (
            <p
              className={cm.cn('mt-0.5 text-[11px] truncate')}
              style={{ color: 'var(--color-text-muted)' }}
            >
              {collection.description}
            </p>
          ) : null}
        </div>
        <span
          className={cm.cn(
            'font-mono text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-method-patch) 18%, transparent)',
            color: 'var(--color-method-patch)',
          }}
        >
          {collection.requests.length}
        </span>
      </button>

      {open ? (
        <ul
          className={cm.cn('px-3 pb-3 pt-1 space-y-1')}
          style={{
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-background) 35%, transparent)',
          }}
        >
          {collection.requests.map((req) => {
            const tone =
              req.last_run_status === 'failed'
                ? 'var(--color-error)'
                : req.last_run_status === 'success'
                  ? 'var(--color-success)'
                  : 'var(--color-text-muted)'
            return (
              <li key={req.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(req)}
                  className={cm.cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-white/[0.05] text-left',
                  )}
                  data-mol-id={`collection-request-${req.id}`}
                >
                  <span style={{ width: 56 }}>
                    <MethodBadge method={req.method} short />
                  </span>
                  <span
                    className={cm.cn('flex-1 truncate font-mono text-[13px]')}
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {req.path}
                  </span>
                  {req.last_run_at ? (
                    <span className={cm.cn('hidden md:flex items-center gap-1.5')}>
                      <span
                        className={cm.cn('inline-block w-1.5 h-1.5 rounded-full')}
                        style={{ backgroundColor: tone }}
                        aria-hidden="true"
                      />
                      <span
                        className={cm.cn('font-mono text-[11px]')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {fmtRelative(req.last_run_at)}
                      </span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

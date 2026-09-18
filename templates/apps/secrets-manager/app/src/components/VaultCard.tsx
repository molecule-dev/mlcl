import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretStatusPill, type SecretStatusTone } from './SecretStatusPill.js'

/**
 * Arcanum vault card — terminal-aesthetic card with a coloured `border-l`
 * stripe keyed to environment, an inline mono path/host header, a
 * 3-up KPI grid (secrets / members / next rotation), and an action
 * footer with a status badge + Open button.
 *
 * Translated from database-admin's ConnectionCard.tsx (engine accent +
 * env badge + 3-col KPI grid + footer button) with the engine swapped
 * for environment tone and the KPI columns recoloured to Arcanum's
 * secret-state palette in DESIGN.md.
 */

export interface VaultCardData {
  id: string
  /** Display name (e.g. `acme-prod`). */
  name: string
  /** Full vault path / namespace (rendered as inline mono). */
  path: string
  environment: 'production' | 'staging' | 'dev'
  /** Number of secrets stored. */
  secretCount: number
  /** Number of team members with access. */
  memberCount: number
  /** Friendly next-rotation hint (e.g. `in 3 days`, `overdue`). */
  nextRotation?: string
  /** Tone for the next-rotation pill. */
  rotationTone?: SecretStatusTone
  /** Free-form footer message ("Updated 2m ago", "Locked 14m ago"). */
  lastEvent?: string
}

interface VaultCardProps {
  vault: VaultCardData
  /** Slot for an action button — defaults to "Open vault" link. */
  action?: React.ReactNode
}

const ENV_ACCENT: Record<VaultCardData['environment'], string> = {
  production: 'var(--color-red)',
  staging: 'var(--color-violet)',
  dev: 'var(--color-sky)',
}

const ENV_ICON: Record<VaultCardData['environment'], string> = {
  production: 'shield_lock',
  staging: 'science',
  dev: 'developer_mode',
}

export function VaultCard({ vault, action }: VaultCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ENV_ACCENT[vault.environment]
  const accentBg = `color-mix(in srgb, ${accent} 12%, transparent)`

  return (
    <article
      data-mol-id={`vault-card-${vault.id}`}
      className={cm.cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface',
        'transition-colors hover:border-primary/50',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('absolute left-0 top-0 bottom-0 w-1 opacity-80')}
        style={{ backgroundColor: accent }}
      />

      <div className={cm.cn('flex-1 p-4 pl-5 flex flex-col gap-3')}>
        <header className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn('inline-flex items-center justify-center rounded-md p-1.5')}
              style={{ backgroundColor: accentBg, color: accent }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[20px]">
                {ENV_ICON[vault.environment]}
              </span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }))}>
              <h3 className={cm.cn('font-headline font-semibold text-text leading-tight')}>
                {vault.name}
              </h3>
              <span
                className={cm.cn(
                  'mt-0.5 inline-block self-start rounded border border-border bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-muted',
                )}
              >
                {t('vaultCard.vaultLabel', {}, { defaultValue: 'Vault' })}
              </span>
            </div>
          </div>
          <SecretStatusPill tone={vault.environment} />
        </header>

        <p
          className={cm.cn(
            'truncate rounded border border-border/50 bg-background p-1.5 font-mono text-[11px] text-muted',
          )}
          title={vault.path}
        >
          {vault.path}
        </p>

        <dl className={cm.cn('mt-auto grid grid-cols-3 gap-2 text-xs')}>
          <div>
            <dt className={cm.cn('text-[10px] uppercase tracking-wider text-muted')}>
              {t('vaultCard.secrets', {}, { defaultValue: 'Secrets' })}
            </dt>
            <dd className={cm.cn('font-mono font-extrabold tabular-nums text-text')}>
              {vault.secretCount}
            </dd>
          </div>
          <div>
            <dt className={cm.cn('text-[10px] uppercase tracking-wider text-muted')}>
              {t('nav.members', {}, { defaultValue: 'Members' })}
            </dt>
            <dd className={cm.cn('font-mono font-extrabold tabular-nums text-text')}>
              {vault.memberCount}
            </dd>
          </div>
          <div className={cm.cn('text-right')}>
            <dt className={cm.cn('text-[10px] uppercase tracking-wider text-muted')}>
              {t('vaultCard.nextRotation', {}, { defaultValue: 'Next rotation' })}
            </dt>
            <dd className={cm.cn('font-mono text-text flex items-center justify-end gap-1')}>
              {vault.rotationTone ? <SecretStatusPill tone={vault.rotationTone} compact /> : null}
              <span>{vault.nextRotation ?? '—'}</span>
            </dd>
          </div>
        </dl>
      </div>

      <footer
        className={cm.cn(
          'flex h-10 items-center justify-between border-t border-border bg-surface2/50 px-4',
        )}
      >
        <span className={cm.cn('font-mono text-[10px] text-muted')}>{vault.lastEvent ?? ''}</span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {action ?? (
            <Link
              to={`/vaults/${vault.id}`}
              className={cm.cn(
                'rounded border border-primary/20 bg-primary/10 px-3 py-1 font-headline text-[11px] font-semibold text-primary',
                'transition-colors hover:border-primary hover:bg-primary hover:text-on-primary',
              )}
            >
              {t('vaultCard.open', {}, { defaultValue: 'Open vault' })}
            </Link>
          )}
        </div>
      </footer>
    </article>
  )
}

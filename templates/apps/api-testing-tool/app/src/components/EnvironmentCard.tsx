import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from './StatusPill.js'

/**
 * Environment configuration card — gradient-tinted hero with name +
 * health pill + active toggle, the env URL, and a key/value preview of
 * the top variables. Decorative blurred orb for the hero feel.
 *
 * Translated from ci-cd-dashboard's EnvironmentCard hero shape (gradient
 * background, frosted-glass pills, decorative orb) and re-skinned for
 * Pylon's HTTP-environment metaphor (production / staging / local).
 */

export type EnvironmentTone = 'production' | 'staging' | 'local' | 'preview'

export interface EnvironmentVariable {
  key: string
  value: string
  /** Whether the value is a secret (will be masked). */
  secret?: boolean
}

export interface EnvironmentData {
  id: string
  name: string
  base_url: string
  tone: EnvironmentTone
  is_active?: boolean
  variables: EnvironmentVariable[]
}

const PALETTE: Record<
  EnvironmentTone,
  { gradFrom: string; gradTo: string; accent: string; orb: string; label: string }
> = {
  production: {
    gradFrom: 'rgba(239, 68, 68, 0.30)',
    gradTo: 'rgba(167, 139, 250, 0.15)',
    accent: '#ef4444',
    orb: 'rgba(239, 68, 68, 0.30)',
    label: 'Production',
  },
  staging: {
    gradFrom: 'rgba(245, 158, 11, 0.28)',
    gradTo: 'rgba(99, 102, 241, 0.15)',
    accent: '#f59e0b',
    orb: 'rgba(245, 158, 11, 0.28)',
    label: 'Staging',
  },
  preview: {
    gradFrom: 'rgba(167, 139, 250, 0.30)',
    gradTo: 'rgba(59, 130, 246, 0.18)',
    accent: '#a78bfa',
    orb: 'rgba(167, 139, 250, 0.30)',
    label: 'Preview',
  },
  local: {
    gradFrom: 'rgba(16, 185, 129, 0.30)',
    gradTo: 'rgba(99, 102, 241, 0.15)',
    accent: '#10b981',
    orb: 'rgba(16, 185, 129, 0.30)',
    label: 'Local',
  },
}

interface EnvironmentCardProps {
  environment: EnvironmentData
}

function maskValue(value: string): string {
  if (value.length <= 4) return '••••'
  return `${value.slice(0, 2)}••••${value.slice(-2)}`
}

export function EnvironmentCard({ environment }: EnvironmentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = PALETTE[environment.tone]

  return (
    <article
      className={cm.cn('relative overflow-hidden rounded-[1.5rem]')}
      style={{
        backgroundImage: `linear-gradient(135deg, ${tone.gradFrom}, ${tone.gradTo})`,
        backgroundColor: 'var(--color-background)',
        border: `1px solid var(--color-border)`,
      }}
      data-mol-id={`environment-card-${environment.id}`}
    >
      <div
        className={cm.cn(
          'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none',
        )}
        style={{ backgroundColor: tone.orb }}
        aria-hidden="true"
      />

      <header className={cm.cn('relative p-6 pb-5')}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          <div className={cm.cn('flex items-center gap-3 min-w-0')}>
            <h3
              className={cm.cn('text-2xl font-extrabold tracking-tight truncate')}
              style={{ color: 'var(--color-text)' }}
            >
              {environment.name}
            </h3>
            <StatusPill
              status={environment.is_active ? 'healthy' : 'cancelled'}
              label={
                environment.is_active
                  ? t('status.active', {}, { defaultValue: 'Active' })
                  : t('environmentCard.inactive', {}, { defaultValue: 'Idle' })
              }
            />
          </div>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
              color: 'var(--color-text)',
            }}
          >
            {t(`environmentCard.tone.${environment.tone}`, {}, { defaultValue: tone.label })}
          </span>
        </div>
        <p
          className={cm.cn('mt-2 font-mono text-xs truncate')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[12px] mr-1 align-middle')}
            aria-hidden="true"
          >
            link
          </span>
          {environment.base_url}
        </p>
      </header>

      <section
        className={cm.cn('relative border-t px-6 py-5')}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-background) 45%, transparent)',
        }}
      >
        <p
          className={cm.cn('mb-3 text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('environmentCard.variables', {}, { defaultValue: 'Variables' })}
          <span className={cm.cn('ml-2 font-mono opacity-70')}>{environment.variables.length}</span>
        </p>
        <ul className={cm.cn('space-y-1.5')}>
          {environment.variables.slice(0, 4).map((v) => (
            <li key={v.key} className={cm.cn('flex items-center gap-3 font-mono text-xs')}>
              <span
                className={cm.cn('font-semibold truncate w-32')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {v.key}
              </span>
              <span
                className={cm.cn('flex-1 truncate')}
                style={{
                  color: v.secret ? 'var(--color-method-patch)' : 'var(--color-text-primary)',
                }}
              >
                {v.secret ? maskValue(v.value) : v.value}
              </span>
              {v.secret ? (
                <span
                  className={cm.cn('material-symbols-outlined text-[14px]')}
                  style={{ color: 'var(--color-method-patch)' }}
                  aria-hidden="true"
                >
                  lock
                </span>
              ) : null}
            </li>
          ))}
          {environment.variables.length > 4 ? (
            <li
              className={cm.cn('text-[11px] font-mono pt-1.5')}
              style={{ color: 'var(--color-text-muted)' }}
            >
              + {environment.variables.length - 4}{' '}
              {t('environmentCard.more', {}, { defaultValue: 'more' })}
            </li>
          ) : null}
        </ul>
      </section>
    </article>
  )
}

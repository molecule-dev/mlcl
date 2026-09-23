import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface SecretApi {
  id: string
  vault_id?: string | null
  key: string
  name?: string
  path?: string
  value?: string | null
  status?: string
  environment: 'production' | 'staging' | 'development' | 'test'
  rotation_days?: number | null
  last_rotated_at?: string | null
  description?: string | null
  version?: number
}

interface AuditEntryApi {
  id: string
  action: string
  resource: string
  resourceId?: string | null
  timestamp: string
  ip?: string | null
  details?: Record<string, unknown> | null
}

const ACTION_TONE: Record<string, SecretStatusTone> = {
  'secret.rotated': 'active',
  'secret.created': 'inherited',
  'secret.read': 'masked',
  'secret.updated': 'expiring',
  'secret.deleted': 'revoked',
}

export function SecretDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [secret, setSecret] = useState<SecretApi | null>(null)
  const [timeline, setTimeline] = useState<AuditEntryApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [rotateComment, setRotateComment] = useState('')
  const [rotating, setRotating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const reload = async () => {
    if (!id) return
    try {
      const [sRes, aRes] = await Promise.all([
        http.get<SecretApi>(`/api/secrets/${id}`),
        http.get<AuditEntryApi[]>(`/api/audit-log?resource=secret&resource_id=${id}&perPage=20`),
      ])
      setSecret((sRes.data as SecretApi) ?? null)
      setTimeline(Array.isArray(aRes.data) ? (aRes.data as AuditEntryApi[]) : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  const value = secret?.value ?? ''
  const masked = '•'.repeat(24)

  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      // Metadata only — never the secret value in telemetry.
      void track({ name: 'secret.copied', properties: { secret_id: id } })
    } catch (_error) {
      /* clipboard not available */
    }
  }

  const toggleReveal = () => {
    setRevealed((r) => {
      if (!r) void track({ name: 'secret.revealed', properties: { secret_id: id } })
      return !r
    })
  }

  const submitRotation = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !newValue) return
    setRotating(true)
    try {
      await http.post(`/api/secrets/${id}/rotate`, {
        value: newValue,
        comment: rotateComment || undefined,
      })
      setRotateOpen(false)
      setNewValue('')
      setRotateComment('')
      void track({ name: 'secret.rotated', properties: { secret_id: id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'rotate failed')
    } finally {
      setRotating(false)
    }
  }

  const onDelete = async () => {
    if (!id || !secret) return
    if (
      !window.confirm(t('secretDetail.confirmDelete', {}, { defaultValue: 'Delete this secret?' }))
    )
      return
    setDeleting(true)
    try {
      await http.delete(`/api/secrets/${id}`)
      void track({ name: 'secret.deleted', properties: { secret_id: id } })
      if (secret.vault_id) navigate(`/vaults/${secret.vault_id}`)
      else navigate('/vaults')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed')
      setDeleting(false)
    }
  }

  const envTone = useMemo<SecretStatusTone>(() => {
    if (!secret) return 'masked'
    return secret.environment === 'production' || secret.environment === 'staging'
      ? secret.environment
      : 'dev'
  }, [secret])

  const backTo = secret?.vault_id ? `/vaults/${secret.vault_id}` : '/vaults'

  return (
    <SecretsManagerLayout>
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <Link
          to={backTo}
          data-mol-id="secret-detail-back"
          className={cm.cn(
            'inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-primary',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            arrow_back
          </span>
          {t('secretDetail.back', {}, { defaultValue: 'Back to vault' })}
        </Link>

        {loading ? (
          <div
            data-mol-id="secret-detail-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 font-mono text-xs text-muted',
            )}
          >
            {t('secretDetail.loading', {}, { defaultValue: 'Loading secret…' })}
          </div>
        ) : !secret ? (
          <div
            data-mol-id="secret-detail-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error ?? t('secretDetail.notFound', {}, { defaultValue: 'Secret not found' })}
          </div>
        ) : (
          <>
            <header
              className={cm.cn(
                'relative overflow-hidden rounded-2xl border border-border bg-surface p-6',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-70',
                )}
              />
              <div
                className={cm.cn(
                  'flex flex-col gap-3 md:flex-row md:items-start md:justify-between',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <span
                    className={cm.cn('font-mono text-[10px] uppercase tracking-widest text-muted')}
                  >
                    {t('secretDetail.kicker', {}, { defaultValue: 'Secret' })}
                  </span>
                  <h1
                    data-mol-id="secret-detail-key"
                    className={cm.cn('font-mono text-3xl font-extrabold tracking-tight text-text')}
                  >
                    {secret.key}
                  </h1>
                  {secret.description ? (
                    <p className={cm.cn('font-body text-sm text-muted')}>{secret.description}</p>
                  ) : null}
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <SecretStatusPill tone="active" />
                  <SecretStatusPill tone={envTone} />
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    data-mol-id="secret-delete"
                    className={cm.cn(
                      'inline-flex h-9 items-center gap-1 rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-muted transition-colors hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      delete
                    </span>
                    {t('common.delete', {}, { defaultValue: 'Delete' })}
                  </button>
                </div>
              </div>
            </header>

            <div className={cm.cn('grid gap-5 lg:grid-cols-[1.6fr_1fr]')}>
              <div className={cm.cn('flex flex-col gap-5')}>
                <section className={cm.cn('rounded-xl border border-border bg-surface p-5')}>
                  <header
                    className={cm.cn(
                      'flex items-center justify-between border-b border-border/60 pb-3 font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                    )}
                  >
                    <span>
                      {t(
                        'secretDetail.value',
                        {},
                        { defaultValue: `Value · v${secret.version ?? 1}` },
                      )}
                    </span>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                      <button
                        type="button"
                        onClick={toggleReveal}
                        data-mol-id="secret-value-toggle"
                        className={cm.cn(
                          'inline-flex h-7 items-center gap-1 rounded border border-border bg-surface px-2 font-mono text-[11px] text-muted transition-colors hover:border-primary hover:text-primary',
                        )}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {revealed ? 'visibility_off' : 'visibility'}
                        </span>
                        {revealed
                          ? t('secretDetail.hide', {}, { defaultValue: 'Hide' })
                          : t('secretDetail.reveal', {}, { defaultValue: 'Reveal' })}
                      </button>
                      <button
                        type="button"
                        onClick={copy}
                        data-mol-id="secret-value-copy"
                        className={cm.cn(
                          'inline-flex h-7 items-center gap-1 rounded border border-border bg-surface px-2 font-mono text-[11px] text-muted transition-colors hover:border-primary hover:text-primary',
                          copied && 'border-primary text-primary',
                        )}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                        {copied
                          ? t('common.copied', {}, { defaultValue: 'Copied' })
                          : t('common.copy', {}, { defaultValue: 'Copy' })}
                      </button>
                    </div>
                  </header>
                  <pre
                    data-mol-id="secret-value"
                    className={cm.cn(
                      'mt-3 overflow-x-auto rounded-md border border-border/60 bg-background p-3 font-mono text-sm whitespace-pre-wrap break-all',
                      revealed ? 'text-primary' : 'text-secret-masked',
                    )}
                    style={{ letterSpacing: revealed ? 'normal' : '0.15em' }}
                  >
                    {revealed ? value : masked}
                  </pre>
                  <p className={cm.cn('mt-3 font-mono text-[11px] text-muted')}>
                    {t(
                      'secretDetail.holdHint',
                      {},
                      {
                        defaultValue:
                          'Reveals are logged to the audit trail with actor + IP. AES-256 encrypted at rest.',
                      },
                    )}
                  </p>
                </section>

                <section className={cm.cn('rounded-xl border border-border bg-surface p-5')}>
                  <header
                    className={cm.cn(
                      'flex items-center justify-between border-b border-border/60 pb-3',
                    )}
                  >
                    <h2
                      className={cm.cn(
                        'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                      )}
                    >
                      {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
                    </h2>
                    <Link
                      to="/audit"
                      className={cm.cn(
                        'inline-flex items-center gap-1 font-headline text-xs font-semibold text-primary transition-colors hover:text-primary/80',
                      )}
                    >
                      {t('secretDetail.fullAudit', {}, { defaultValue: 'Full audit' })}
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined"
                        style={{ fontSize: '0.875rem' }}
                      >
                        arrow_forward
                      </span>
                    </Link>
                  </header>
                  {timeline.length === 0 ? (
                    <p className={cm.cn('mt-4 font-mono text-xs text-muted')}>
                      {t('secretDetail.timelineEmpty', {}, { defaultValue: 'No activity yet.' })}
                    </p>
                  ) : (
                    <ol className={cm.cn('mt-3 flex flex-col gap-3')} data-mol-id="secret-timeline">
                      {timeline.map((event) => (
                        <li
                          key={event.id}
                          className={cm.cn(
                            'flex items-start gap-3 rounded-md border border-border/40 bg-background/40 p-3',
                          )}
                        >
                          <SecretStatusPill
                            tone={ACTION_TONE[event.action] ?? 'masked'}
                            label={event.action.replace('secret.', '')}
                            compact
                          />
                          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                            <span className={cm.cn('font-mono text-xs text-text')}>
                              {String(
                                (event.details as Record<string, unknown> | null)?.key ??
                                  secret.key,
                              )}
                            </span>
                            <span className={cm.cn('font-mono text-[11px] text-muted')}>
                              {new Date(event.timestamp).toLocaleString()} · {event.ip ?? '—'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>

              <aside className={cm.cn('flex flex-col gap-5')}>
                <section className={cm.cn('rounded-xl border border-border bg-surface p-5')}>
                  <header
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                    )}
                  >
                    {t('secretDetail.rotationPolicy', {}, { defaultValue: 'Rotation policy' })}
                  </header>
                  <dl className={cm.cn('mt-4 grid grid-cols-2 gap-3 text-xs')}>
                    <div>
                      <dt
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t('secretDetail.cadence', {}, { defaultValue: 'Cadence' })}
                      </dt>
                      <dd className={cm.cn('font-mono text-text')}>
                        {secret.rotation_days && secret.rotation_days > 0
                          ? `every ${secret.rotation_days}d`
                          : t('secretDetail.manualOnly', {}, { defaultValue: 'manual only' })}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t('secretDetail.last', {}, { defaultValue: 'Last' })}
                      </dt>
                      <dd className={cm.cn('font-mono text-text')}>
                        {secret.last_rotated_at
                          ? new Date(secret.last_rotated_at).toLocaleDateString()
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t('secretDetail.version', {}, { defaultValue: 'Version' })}
                      </dt>
                      <dd className={cm.cn('font-mono text-text')}>v{secret.version ?? 1}</dd>
                    </div>
                    <div>
                      <dt
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t('secretDetail.environment', {}, { defaultValue: 'Env' })}
                      </dt>
                      <dd className={cm.cn('font-mono text-text')}>{secret.environment}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => setRotateOpen((v) => !v)}
                    data-mol-id="secret-rotate-toggle"
                    className={cm.cn(
                      'mt-4 inline-flex h-9 w-full items-center justify-center gap-1 rounded border border-primary/30 bg-primary/10 font-headline text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      autorenew
                    </span>
                    {t(
                      'secretDetail.rotateNow',
                      {},
                      { defaultValue: rotateOpen ? 'Cancel rotation' : 'Rotate now' },
                    )}
                  </button>
                  {rotateOpen ? (
                    <form onSubmit={submitRotation} className={cm.cn('mt-3 flex flex-col gap-2')}>
                      <label
                        className={cm.cn(
                          'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t('secretDetail.newValue', {}, { defaultValue: 'New value' })}
                        <textarea
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          rows={3}
                          required
                          data-mol-id="secret-rotate-value"
                          className={cm.cn(
                            'w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                          )}
                        />
                      </label>
                      <label
                        className={cm.cn(
                          'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                        )}
                      >
                        {t(
                          'secretDetail.rotateComment',
                          {},
                          { defaultValue: 'Comment (optional)' },
                        )}
                        <input
                          type="text"
                          value={rotateComment}
                          onChange={(e) => setRotateComment(e.target.value)}
                          maxLength={500}
                          data-mol-id="secret-rotate-comment"
                          className={cm.cn(
                            'h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                          )}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={rotating}
                        data-mol-id="secret-rotate-submit"
                        className={cm.cn(
                          'inline-flex h-8 items-center justify-center rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
                        )}
                      >
                        {rotating
                          ? t('common.rotating', {}, { defaultValue: 'Rotating…' })
                          : t(
                              'secretDetail.confirmRotate',
                              {},
                              { defaultValue: 'Confirm rotation' },
                            )}
                      </button>
                    </form>
                  ) : null}
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default SecretDetail

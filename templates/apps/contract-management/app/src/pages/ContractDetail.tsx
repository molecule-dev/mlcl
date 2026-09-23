import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ContractStatus, ContractStatusPill } from '../components/ContractStatusPill.js'
import { SafeHtml } from '../components/SafeHtml.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Signer {
  id?: string
  name: string
  email: string
  status: 'pending' | 'viewed' | 'signed' | 'declined'
  signed_at?: string | null
  ip?: string
}

interface AuditEvent {
  id: string
  occurred_at: string
  actor: string
  action: string
}

interface ContractDoc {
  id: string
  number: string
  title: string
  counterparty: string
  type: string
  status: ContractStatus
  amount_cents: number | null
  effective_at: string | null
  expires_at: string | null
  body_html: string
  signers: Signer[]
  audit_log: AuditEvent[]
}

const SIGNER_TONE: Record<Signer['status'], string> = {
  pending: 'bg-surface-container text-on-surface-variant',
  viewed: 'bg-info/15 text-info',
  signed: 'bg-success/15 text-success',
  declined: 'bg-error/15 text-error',
}

const SIGNER_DOT: Record<Signer['status'], string> = {
  pending: 'bg-outline',
  viewed: 'bg-info',
  signed: 'bg-success',
  declined: 'bg-error',
}

const SIGNER_LABEL: Record<Signer['status'], string> = {
  pending: 'Pending',
  viewed: 'Viewed',
  signed: 'Signed',
  declined: 'Declined',
}

const AUDIT_DOT_COLOR = (action: string): string => {
  const a = action.toLowerCase()
  if (a.includes('signed')) return 'bg-success'
  if (a.includes('viewed')) return 'bg-info'
  if (a.includes('sent')) return 'bg-warning'
  if (a.includes('voided') || a.includes('declined')) return 'bg-error'
  if (a.includes('expired')) return 'bg-error'
  return 'bg-primary'
}

function fmtUsd(cents: number | null): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ContractDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<ContractDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'send' | 'sign' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/contracts/${id}`)
      .then((res) => {
        if (!cancelled) setContract(unwrapSingle<ContractDoc>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('contractDetail.loadError', {}, { defaultValue: 'Failed to load contract.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function reload() {
    if (!id) return
    const fresh = await http.get(`/api/contracts/${id}`)
    setContract(unwrapSingle<ContractDoc>(fresh))
  }

  async function handleSend() {
    if (!id || busy) return
    setActionError(null)
    setBusy('send')
    try {
      await http.post(`/api/contracts/${id}/send`, {})
      void track({ name: 'contract.sent', properties: { contractId: id } })
      await reload()
    } catch (err) {
      logError('contractDetail.send', err)
      setActionError(
        t('contractDetail.sendError', {}, { defaultValue: 'Failed to send for signature.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleSign() {
    if (!id || busy) return
    setActionError(null)
    setBusy('sign')
    try {
      await http.post(`/api/contracts/${id}/sign`, {})
      void track({ name: 'contract.signed', properties: { contractId: id } })
      await reload()
    } catch (err) {
      logError('contractDetail.sign', err)
      setActionError(
        t('contractDetail.signError', {}, { defaultValue: 'Failed to sign contract.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  function handleDownload() {
    window.print()
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('contractDetail.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  if (error || !contract)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('contractDetail.notFound', {}, { defaultValue: 'Contract not found.' })}
      </div>
    )

  const signedCount = contract.signers.filter((s) => s.status === 'signed').length
  const totalSigners = contract.signers.length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }))}
      >
        <Link
          to="/contracts"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          ← {t('contractDetail.back', {}, { defaultValue: 'All contracts' })}
        </Link>
        <div className={cm.flex({ gap: 'sm' })}>
          <button
            type="button"
            id="download-pdf"
            onClick={handleDownload}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            {t('contractDetail.downloadCta', {}, { defaultValue: 'Download PDF' })}
          </button>
          {contract.status === 'draft' ? (
            <button
              type="button"
              id="send-for-signature"
              onClick={handleSend}
              disabled={busy !== null}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('extrabold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60',
              )}
            >
              {busy === 'send'
                ? t('contractDetail.sending', {}, { defaultValue: 'Sending\u2026' })
                : t('contractDetail.sendCta', {}, { defaultValue: 'Send for signature' })}
            </button>
          ) : null}
          {contract.status === 'pending' ? (
            <button
              type="button"
              id="sign-now"
              onClick={handleSign}
              disabled={busy !== null}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('extrabold'),
                cm.textSize('sm'),
                'rounded-full bg-[var(--color-status-pending)] text-sidebar-bg shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60',
              )}
            >
              {busy === 'sign'
                ? t('contractDetail.signing', {}, { defaultValue: 'Signing\u2026' })
                : t('contractDetail.signCta', {}, { defaultValue: 'Sign now' })}
            </button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-md bg-error/10 text-error',
          )}
        >
          {actionError}
        </div>
      ) : null}

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sidebar-bg via-[var(--mol-color-primary-dark)] to-[var(--mol-color-primary)] text-white shadow-xl',
        )}
      >
        <div
          aria-hidden="true"
          className={
            'pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--color-status-pending)]/20 blur-3xl'
          }
        />
        <div
          aria-hidden="true"
          className={
            'pointer-events-none absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-surface/5 blur-3xl'
          }
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
            'relative z-10',
          )}
        >
          <div className={'min-w-0'}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'font-mono uppercase tracking-widest text-[var(--color-status-pending)]',
              )}
            >
              {contract.number} · {contract.type.toUpperCase()}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight',
              )}
            >
              {contract.title}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-white/70')}>
              {t(
                'contractDetail.with',
                { name: contract.counterparty },
                { defaultValue: 'with {{name}}' },
              )}
            </p>
          </div>
          <ContractStatusPill status={contract.status} size="md" />
        </div>

        <dl className={cm.cn(cm.sp('mt', 8), cm.grid({ cols: 4, gap: 'md' }), 'relative z-10')}>
          <HeroMeta
            label={t('contractDetail.amount', {}, { defaultValue: 'Value' })}
            value={fmtUsd(contract.amount_cents)}
          />
          <HeroMeta
            label={t('contractDetail.effective', {}, { defaultValue: 'Effective' })}
            value={fmtDate(contract.effective_at)}
          />
          <HeroMeta
            label={t('contractDetail.expires', {}, { defaultValue: 'Expires' })}
            value={fmtDate(contract.expires_at)}
          />
          <HeroMeta
            label={t('contractDetail.signaturesLabel', {}, { defaultValue: 'Signatures' })}
            value={`${signedCount} / ${totalSigners}`}
          />
        </dl>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <article
          className={cm.cn(
            'col-span-12 lg:col-span-8',
            cm.sp('p', 10),
            'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
          )}
        >
          <SafeHtml
            html={contract.body_html}
            className="prose prose-sm max-w-none text-on-surface"
            style={{ fontFamily: 'var(--mol-font-serif, "Source Serif 4", Georgia, serif)' }}
          />
        </article>

        <aside className={cm.cn('col-span-12 lg:col-span-4 space-y-4')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('contractDetail.signersHeading', {}, { defaultValue: 'Signers' })}
            </h2>
            <ul className={cm.cn(cm.sp('mt', 4), 'space-y-4')}>
              {contract.signers.length === 0 ? (
                <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('contractDetail.noSigners', {}, { defaultValue: 'No signers yet.' })}
                </li>
              ) : (
                contract.signers.map((s) => (
                  <li
                    key={s.id ?? s.email}
                    className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}
                  >
                    <div className={'min-w-0'}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-[var(--mol-color-primary)]',
                        )}
                      >
                        {s.name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {s.email}
                      </p>
                      {s.signed_at ? (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'contractDetail.signedAt',
                            { when: fmtDateTime(s.signed_at) },
                            { defaultValue: 'Signed {{when}}' },
                          )}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('extrabold'),
                        'inline-flex items-center gap-1 rounded-full uppercase tracking-widest py-0.5',
                        SIGNER_TONE[s.status],
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          SIGNER_DOT[s.status],
                        )}
                      />
                      {t(
                        `contractDetail.signerStatus.${s.status}`,
                        {},
                        { defaultValue: SIGNER_LABEL[s.status] },
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('contractDetail.auditHeading', {}, { defaultValue: 'Audit log' })}
            </h2>
            {contract.audit_log.length === 0 ? (
              <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('contractDetail.noAudit', {}, { defaultValue: 'No events recorded.' })}
              </p>
            ) : (
              <ol
                className={cm.cn(
                  cm.sp('mt', 5),
                  'relative space-y-5 border-l-2 border-outline-variant pl-5',
                )}
              >
                {contract.audit_log.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'absolute -left-[27px] top-1 inline-block h-3 w-3 rounded-full ring-4 ring-surface-container-lowest',
                        AUDIT_DOT_COLOR(ev.action),
                      )}
                    />
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-mono tabular-nums text-on-surface-variant',
                      )}
                    >
                      {fmtDateTime(ev.occurred_at)}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'mt-0.5')}>
                      <span className={cm.fontWeight('semibold')}>{ev.actor}</span>{' '}
                      <span className="text-on-surface-variant">{ev.action}</span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-2xl bg-surface/10 backdrop-blur-md ring-1 ring-white/15',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
          'uppercase tracking-widest text-white/70',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.sp('mt', 1),
          cm.textSize('lg'),
          cm.fontWeight('extrabold'),
          'tabular-nums',
        )}
      >
        {value}
      </p>
    </div>
  )
}

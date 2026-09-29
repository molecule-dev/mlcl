import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney } from '../lib/format.js'
import { unwrapSingle } from '../lib/unwrap.js'
import type { DonorDetail, DonorNote } from '../types.js'

export function DonorDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<{ name?: string | null }>()
  const { id } = useParams<{ id: string }>()
  const [donor, setDonor] = useState<DonorDetail | null>(null)
  const [notes, setNotes] = useState<DonorNote[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/donors/${id}`)
      .then((res) => {
        if (!cancelled) {
          const d = unwrapSingle<DonorDetail>(res)
          setDonor(d)
          setNotes(d?.notes ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('donors.notFound', {}, { defaultValue: 'Donor not found.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !noteBody.trim()) return
    setSavingNote(true)
    setNoteError(null)
    try {
      const res = await http.post(`/api/donors/${id}/notes`, {
        body: noteBody.trim(),
        author: auth.user?.name ?? '',
      })
      const created = unwrapSingle<DonorNote>(res)
      if (created) setNotes((prev) => [created, ...prev])
      track({ name: 'donor.note_added', properties: { donor_id: id } })
      setNoteBody('')
    } catch (_error) {
      // Save failures surface INLINE by the note form — this must not touch
      // the page-level `error`, which swaps the whole profile for an
      // error page.
      setNoteError(t('donors.noteError', {}, { defaultValue: 'Failed to save the note.' }))
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('p', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !donor) {
    return (
      <div className={cm.cn(cm.sp('p', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/donors" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('donors.backToList', {}, { defaultValue: 'Back to donors' })}
        </Link>
      </div>
    )
  }

  const thisYear = new Date().getFullYear()
  const ytdCents = donor.gifts
    .filter((g) => g.gift_date.slice(0, 4) === String(thisYear))
    .reduce((sum, g) => sum + g.amount_cents, 0)
  const receiptedCount = donor.gifts.filter((g) => g.receipted).length
  const latestReceipt = donor.gifts.find((g) => g.receipt_id && g.receipted) ?? null
  const methodsUsed = Array.from(new Set(donor.gifts.map((g) => g.method)))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <nav>
        <Link to="/donors" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('donors.backToList', {}, { defaultValue: 'Back to donors' })}
        </Link>
      </nav>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'start', justify: 'between', wrap: 'wrap' })}>
          <div>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{donor.name}</h1>
            {donor.is_organization ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('donors.organizationLabel', {}, { defaultValue: 'Organization / foundation' })}
              </p>
            ) : null}
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {donor.email ?? '—'}
              {donor.phone ? ` · ${donor.phone}` : ''}
              {donor.address ? ` · ${donor.address}` : ''}
            </p>
            <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
              {donor.tags.map((tg) => (
                <span
                  key={tg}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded-full bg-surface-container text-on-surface-variant',
                  )}
                >
                  {t(`donors.tag.${tg}`, {}, { defaultValue: tg.replace(/-/g, ' ') })}
                </span>
              ))}
            </div>
          </div>
          <Link
            to="/gifts/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md',
            )}
          >
            + {t('donors.recordGift', {}, { defaultValue: 'Record gift' })}
          </Link>
        </div>
        <dl className={cm.grid({ cols: 4, gap: 'md' })}>
          <Stat
            label={t('donors.lifetime', {}, { defaultValue: 'Lifetime giving' })}
            value={formatMoney(donor.lifetime_cents)}
          />
          <Stat
            label={t('donors.gifts', {}, { defaultValue: 'Gifts' })}
            value={String(donor.gift_count)}
          />
          <Stat
            label={t('donors.firstGift', {}, { defaultValue: 'First gift' })}
            value={donor.first_gifted_at ?? '—'}
          />
          <Stat
            label={t('donors.lastGift', {}, { defaultValue: 'Last gift' })}
            value={donor.last_gift_at ?? '—'}
          />
        </dl>
      </header>

      <div className={cm.grid({ cols: 3, gap: 'lg' })}>
        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('donors.givingHistory', {}, { defaultValue: 'Giving history' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mb', 4))}>
            {t(
              'donors.givingHistorySubtitle',
              {},
              {
                defaultValue:
                  'Contribution & gift ledger — the itemized record behind every issued receipt.',
              },
            )}
          </p>
          {donor.gifts.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('donors.noGifts', {}, { defaultValue: 'No gifts recorded yet.' })}
            </p>
          ) : (
            <ol className={cm.stack(4)}>
              {donor.gifts.map((g) => (
                <li key={g.id} className={cm.flex({ align: 'start', justify: 'between' })}>
                  <div>
                    <Link
                      to={`/gifts/${g.id}`}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'inline-block py-1',
                      )}
                    >
                      {formatMoney(g.amount_cents)}
                    </Link>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {g.gift_date} · {t(`gift.method.${g.method}`, {}, { defaultValue: g.method })}{' '}
                      · {t(`gift.fund.${g.fund}`, {}, { defaultValue: g.fund })}
                      {g.campaign_name ? ` · ${g.campaign_name}` : ''}
                    </p>
                    {g.receipted ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded-full bg-success-container text-on-success-container',
                        )}
                      >
                        {t('gift.receipted', {}, { defaultValue: 'receipted' })}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('donors.notes', {}, { defaultValue: 'Notes' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mb', 4))}>
            {t(
              'donors.notesSubtitle',
              {},
              {
                defaultValue:
                  'Recent stewardship — touchpoints, call logs, and thank-yous for this donor.',
              },
            )}
          </p>
          <form onSubmit={addNote} className={cm.stack(2)}>
            <textarea
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder={t(
                'donors.notePlaceholder',
                {},
                { defaultValue: 'Preferences, relationships, grant deadlines…' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md w-full',
              )}
            />
            {noteError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
                {noteError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={savingNote || !noteBody.trim()}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50 self-start',
              )}
            >
              {savingNote
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('donors.addNote', {}, { defaultValue: 'Add note' })}
            </button>
          </form>
          <ul className={cm.stack(3)}>
            {notes.map((n) => (
              <li key={n.id} className={cm.cn(cm.sp('pt', 3), 'border-t border-outline-variant')}>
                <p className={cm.textSize('sm')}>{n.body}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {n.author || '—'} · {n.created_at.slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className={cm.stack(4)}>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('donors.liveReceipt', {}, { defaultValue: 'Live tax receipt' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'donors.liveReceiptSubtitle',
                {},
                {
                  defaultValue:
                    'The acknowledgment trail for this donor — issued receipts stay readable forever.',
                },
              )}
            </p>
            {latestReceipt ? (
              <Link
                to={`/receipts/${latestReceipt.receipt_id}`}
                data-mol-id="donor-latest-receipt"
                className={cm.cn(
                  cm.sp('p', 3),
                  'rounded-lg bg-success-container text-on-success-container flex items-center justify-between gap-3',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(
                    'donors.latestReceipt',
                    { year: latestReceipt.gift_date.slice(0, 4) },
                    { defaultValue: 'Receipt on file ({{year}} gift)' },
                  )}
                </span>
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  chevron_right
                </span>
              </Link>
            ) : (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'donors.noReceiptYet',
                  {},
                  {
                    defaultValue:
                      'No receipt issued yet — generate the year-end receipt from the Receipts page.',
                  },
                )}
              </p>
            )}
          </section>

          <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(3))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('donors.fiduciaryProfile', {}, { defaultValue: 'Fiduciary & tax profile' })}
            </h2>
            <dl className={cm.stack(2)}>
              <ProfileRow
                label={t('donors.profileEntityType', {}, { defaultValue: 'Entity type' })}
                value={
                  donor.is_organization
                    ? t(
                        'donors.profileOrgEntity',
                        {},
                        { defaultValue: 'Organization / foundation' },
                      )
                    : t('donors.profileIndividualEntity', {}, { defaultValue: 'Individual' })
                }
              />
              <ProfileRow
                label={t(
                  'donors.profileYtd',
                  { year: thisYear },
                  { defaultValue: '{{year}} giving to date' },
                )}
                value={formatMoney(ytdCents)}
              />
              <ProfileRow
                label={t(
                  'donors.profileReceipts',
                  {},
                  { defaultValue: 'Gifts carrying a receipt' },
                )}
                value={`${receiptedCount} / ${donor.gifts.length}`}
              />
              <ProfileRow
                label={t(
                  'donors.profileMethods',
                  {},
                  { defaultValue: 'Payment methods on record' },
                )}
                value={
                  methodsUsed.length > 0
                    ? methodsUsed
                        .map((m) => t(`gift.method.${m}`, {}, { defaultValue: m }))
                        .join(', ')
                    : '—'
                }
              />
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
      <dt className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{label}</dt>
      <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-right')}>{value}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.sp('mt', 5)}>
      <dt
        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'uppercase tracking-wider')}
      >
        {label}
      </dt>
      <dd className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{value}</dd>
    </div>
  )
}

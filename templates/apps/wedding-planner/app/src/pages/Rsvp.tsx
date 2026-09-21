import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface WeddingInfo {
  partner_a_name: string
  partner_b_name: string
  wedding_date: string
  venue: string | null
  plus_ones_allowed: boolean
  meals: Array<{ name: string; description: string | null }>
}

interface LookupResult {
  guest_id: string
  name: string
  rsvp_status: 'pending' | 'yes' | 'no' | 'maybe'
  meal_choice: string | null
  plus_ones: number
  plus_ones_allowed: boolean
}

type RsvpChoice = 'yes' | 'no' | 'maybe'

const CHOICE_STYLES: Record<RsvpChoice, { bg: string; fg: string; icon: string }> = {
  yes: { bg: 'var(--color-rsvp-yes-bg)', fg: 'var(--color-rsvp-yes)', icon: 'celebration' },
  no: { bg: 'var(--color-rsvp-no-bg)', fg: 'var(--color-rsvp-no)', icon: 'heart_broken' },
  maybe: { bg: 'var(--color-rsvp-maybe-bg)', fg: 'var(--color-rsvp-maybe)', icon: 'help' },
}

/** Formats a date-only `YYYY-MM-DD` (the API normalizes the DATE column to
 *  a calendar string). Rendered with `timeZone: 'UTC'` so every visitor sees
 *  the same calendar day regardless of their UTC offset. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function Rsvp() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { code = '' } = useParams()

  const [info, setInfo] = useState<WeddingInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [choice, setChoice] = useState<RsvpChoice | ''>('')
  const [meal, setMeal] = useState('')
  const [plusOnes, setPlusOnes] = useState(0)
  const [confirmed, setConfirmed] = useState<'yes' | 'no' | 'maybe' | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await http.get(`/api/public/rsvp/${encodeURIComponent(code)}`)
        if (!cancelled) setInfo(res.data as WeddingInfo)
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message ?? 'RSVP code not found')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, code])

  async function findGuest(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setLookupError(null)
    try {
      const res = await http.post(`/api/public/rsvp/${encodeURIComponent(code)}/lookup`, {
        name: name.trim(),
      })
      const found = res.data as LookupResult
      setLookup(found)
      if (found.rsvp_status !== 'pending') setChoice(found.rsvp_status as RsvpChoice)
      setMeal(found.meal_choice ?? '')
      setPlusOnes(found.plus_ones ?? 0)
    } catch (e) {
      setLookup(null)
      setLookupError((e as Error).message ?? 'We could not find that name')
    } finally {
      setBusy(false)
    }
  }

  async function respond(e: React.FormEvent) {
    e.preventDefault()
    if (!lookup || !choice) return
    setBusy(true)
    setLookupError(null)
    try {
      await http.post(`/api/public/rsvp/${encodeURIComponent(code)}/respond`, {
        guest_id: lookup.guest_id,
        rsvp_status: choice,
        meal_choice: choice === 'no' ? null : meal || null,
        plus_ones: choice === 'yes' ? Number(plusOnes) || 0 : 0,
      })
      // The conversion moment of the whole app — the guest's answer lands.
      void track({
        name: 'rsvp.received',
        properties: { code, guest_id: lookup.guest_id, status: choice },
      })
      setConfirmed(choice)
    } catch (e) {
      setLookupError((e as Error).message ?? 'Could not record your response')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = cm.cn(
    'w-full rounded-xl border border-outline-variant/60 bg-input-background px-3 py-2.5',
    'focus:outline-none focus:ring-2 focus:ring-primary/40',
  )

  if (loadError) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          'bg-background text-on-surface antialiased flex flex-col items-center justify-center px-6',
        )}
        data-mol-id="page-rsvp-not-found"
      >
        <span
          className={cm.cn('material-symbols-outlined text-5xl mb-4')}
          style={{ color: 'var(--color-accent)' }}
          aria-hidden="true"
        >
          search_off
        </span>
        <h1 className={cm.cn('text-3xl font-extrabold tracking-tight mb-2')}>
          {t('rsvp.notFoundTitle', {}, { defaultValue: 'We couldn’t find that code' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md text-center mb-6')}
        >
          {t(
            'rsvp.notFoundBody',
            {},
            {
              defaultValue:
                'Double-check the code on your invitation — it looks like ROSE-GARDEN-417 — or ask the couple to resend it.',
            },
          )}
        </p>
        <Link
          to="/"
          className={cm.cn('px-5 py-2.5 rounded-xl font-bold text-white')}
          style={{ background: 'var(--color-primary)' }}
        >
          {t('rsvp.backHome', {}, { defaultValue: 'Back home' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}
      data-mol-id="page-rsvp"
    >
      {/* Compact public header */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('3xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'font-extrabold tracking-tighter text-xl',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-8 h-8 rounded-xl text-white',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                favorite
              </span>
            </span>
            <span style={{ color: 'var(--color-primary)' }}>{APP_NAME}</span>
          </Link>
          <span
            className={cm.cn('text-xs font-mono font-bold tracking-widest text-on-surface-variant')}
          >
            {code.toUpperCase()}
          </span>
        </div>
      </nav>

      <main className={cm.cn(cm.maxW('2xl'), 'px-6 py-12 mx-auto')}>
        {!info ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : confirmed ? (
          /* Confirmation state */
          <section
            className={cm.cn(
              cm.sp('p', 10),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-lg text-center',
            )}
            data-mol-id="rsvp-confirmed"
          >
            <span
              className={cm.cn('material-symbols-outlined text-6xl mb-4')}
              style={{ color: CHOICE_STYLES[confirmed].fg }}
              aria-hidden="true"
            >
              {CHOICE_STYLES[confirmed].icon}
            </span>
            <h1
              className={cm.cn('text-4xl font-extrabold tracking-tight mb-3')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {confirmed === 'yes'
                ? t('rsvp.confirmedYes', {}, { defaultValue: 'We can’t wait to see you there!' })
                : confirmed === 'no'
                  ? t(
                      'rsvp.confirmedNo',
                      {},
                      { defaultValue: 'You’ll be missed — thank you for letting us know.' },
                    )
                  : t(
                      'rsvp.confirmedMaybe',
                      {},
                      { defaultValue: 'Thanks — we’ll keep a seat on hold while you decide.' },
                    )}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'rsvp.confirmedBody',
                {
                  a: info.partner_a_name,
                  b: info.partner_b_name,
                  date: formatDate(info.wedding_date),
                },
                { defaultValue: '{{a}} & {{b}} · {{date}}' },
              )}
            </p>
            {confirmed === 'no' ? null : (
              <p
                className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}
                data-mol-id="rsvp-confirmed-meal"
              >
                {meal
                  ? t('rsvp.confirmedMeal', { meal }, { defaultValue: 'Meal: {{meal}}' })
                  : t('rsvp.confirmedNoMeal', {}, { defaultValue: 'No meal selected' })}
                {confirmed === 'yes' && plusOnes > 0
                  ? t(
                      'rsvp.confirmedPlusOnes',
                      { count: plusOnes },
                      { defaultValue: ' · +{{count}} guest(s)' },
                    )
                  : ''}
              </p>
            )}
          </section>
        ) : !lookup ? (
          /* Step 1 — find your name */
          <section
            className={cm.cn(
              cm.sp('p', 10),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-lg',
            )}
            data-mol-id="rsvp-lookup"
          >
            <p
              className={cm.cn('text-xs font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-accent)' }}
            >
              {t('rsvp.eyebrow', {}, { defaultValue: 'You’re invited' })}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3',
              )}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'rsvp.title',
                { a: info.partner_a_name, b: info.partner_b_name },
                { defaultValue: '{{a}} & {{b}} are getting married' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-8')}>
              {formatDate(info.wedding_date)}
              {info.venue ? ` · ${info.venue}` : ''}
            </p>

            <form onSubmit={findGuest} className={cm.cn(cm.stack(3))}>
              <label className={cm.cn(cm.stack(1))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'rsvp.findName',
                    {},
                    { defaultValue: 'Your name (as written on the invitation)' },
                  )}
                </span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-mol-id="rsvp-name-input"
                  className={cm.cn(inputCls, 'text-lg')}
                />
              </label>
              {lookupError ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-error font-medium')}
                  data-mol-id="rsvp-lookup-error"
                  role="alert"
                >
                  {lookupError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy || !name.trim()}
                data-mol-id="rsvp-lookup-submit"
                className={cm.cn('px-5 py-3 rounded-xl font-bold text-white disabled:opacity-50')}
                style={{ background: 'var(--color-primary)' }}
              >
                {busy
                  ? t('rsvp.looking', {}, { defaultValue: 'Looking…' })
                  : t('rsvp.findMe', {}, { defaultValue: 'Find my invitation' })}
              </button>
            </form>
          </section>
        ) : (
          /* Step 2 — respond */
          <section
            className={cm.cn(
              cm.sp('p', 10),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-lg',
            )}
            data-mol-id="rsvp-respond"
          >
            <p
              className={cm.cn('text-xs font-black uppercase tracking-widest mb-2')}
              style={{ color: 'var(--color-accent)' }}
            >
              {t('rsvp.respondEyebrow', {}, { defaultValue: 'RSVP' })}
            </p>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight mb-1')}>
              {t('rsvp.greeting', { name: lookup.name }, { defaultValue: 'Hello, {{name}}!' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-8')}>
              {t(
                'rsvp.respondBody',
                { a: info.partner_a_name, b: info.partner_b_name },
                { defaultValue: 'Will you be joining {{a}} & {{b}}?' },
              )}
            </p>

            <form onSubmit={respond} className={cm.cn(cm.stack(5))}>
              <div
                className={cm.cn('grid gap-3 sm:grid-cols-3')}
                role="radiogroup"
                aria-label={t('rsvp.choiceAria', {}, { defaultValue: 'Your response' })}
              >
                {(['yes', 'maybe', 'no'] as const).map((option) => {
                  const selected = choice === option
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setChoice(option)}
                      data-mol-id={`rsvp-choice-${option}`}
                      className={cm.cn(
                        'px-4 py-4 rounded-2xl font-bold border-2 transition-all',
                        selected ? 'border-current shadow-md' : 'border-outline-variant/40',
                      )}
                      style={{
                        background: selected ? CHOICE_STYLES[option].bg : 'transparent',
                        color: selected ? CHOICE_STYLES[option].fg : undefined,
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-2xl mb-1 block')}
                        aria-hidden="true"
                      >
                        {CHOICE_STYLES[option].icon}
                      </span>
                      {t(
                        `rsvp.choice.${option}`,
                        {},
                        {
                          defaultValue:
                            option === 'yes'
                              ? 'Joyfully accept'
                              : option === 'no'
                                ? 'Regretfully decline'
                                : 'Not sure yet',
                        },
                      )}
                    </button>
                  )
                })}
              </div>

              {choice === 'yes' || choice === 'maybe' ? (
                <>
                  {info.meals.length > 0 ? (
                    <label className={cm.cn(cm.stack(1))}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('rsvp.mealChoice', {}, { defaultValue: 'Meal choice' })}
                      </span>
                      <select
                        value={meal}
                        onChange={(e) => setMeal(e.target.value)}
                        data-mol-id="rsvp-meal-select"
                        className={inputCls}
                      >
                        <option value="">
                          {t('rsvp.mealNone', {}, { defaultValue: 'No preference' })}
                        </option>
                        {info.meals.map((m) => (
                          <option key={m.name} value={m.name}>
                            {m.name}
                            {m.description ? ` — ${m.description}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {lookup.plus_ones_allowed ? (
                    <label className={cm.cn(cm.stack(1))}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('rsvp.plusOnes', {}, { defaultValue: 'Guests you’re bringing' })}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, 10 - lookup.plus_ones)}
                        value={plusOnes}
                        onChange={(e) => setPlusOnes(Number(e.target.value))}
                        data-mol-id="rsvp-plus-ones"
                        className={cm.cn(inputCls, 'max-w-[8rem]')}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              {lookupError ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-error font-medium')}
                  data-mol-id="rsvp-respond-error"
                  role="alert"
                >
                  {lookupError}
                </p>
              ) : null}

              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <button
                  type="submit"
                  disabled={busy || !choice}
                  data-mol-id="rsvp-respond-submit"
                  className={cm.cn('px-5 py-3 rounded-xl font-bold text-white disabled:opacity-50')}
                  style={{ background: 'var(--color-primary)' }}
                >
                  {busy
                    ? t('rsvp.sending', {}, { defaultValue: 'Sending…' })
                    : t('rsvp.submit', {}, { defaultValue: 'Send my response' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLookup(null)
                    setChoice('')
                    setLookupError(null)
                  }}
                  data-mol-id="rsvp-back"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'font-bold text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('common.back', {}, { defaultValue: 'Back' })}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

export default Rsvp

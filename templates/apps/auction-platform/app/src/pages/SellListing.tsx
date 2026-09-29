import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const CATEGORIES = [
  { key: 'art', defaultLabel: 'Fine art' },
  { key: 'watches', defaultLabel: 'Watches' },
  { key: 'cars', defaultLabel: 'Classic cars' },
  { key: 'jewelry', defaultLabel: 'Jewelry' },
  { key: 'collectibles', defaultLabel: 'Collectibles' },
  { key: 'specialty', defaultLabel: 'Specialty' },
] as const

const DURATIONS = [3, 5, 7, 10] as const

function parseHash(hash: string): {
  category: (typeof CATEGORIES)[number]['key']
  duration: (typeof DURATIONS)[number]
} {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const cat = params.get('cat') as (typeof CATEGORIES)[number]['key'] | null
  const dur = Number(params.get('dur'))
  return {
    category: CATEGORIES.some((c) => c.key === cat)
      ? (cat as (typeof CATEGORIES)[number]['key'])
      : 'watches',
    duration: (DURATIONS as readonly number[]).includes(dur)
      ? (dur as (typeof DURATIONS)[number])
      : 7,
  }
}

export function SellListing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const parsed = parseHash(location.hash)
  const category = parsed.category
  const duration = parsed.duration
  const setCategory = (next: (typeof CATEGORIES)[number]['key']) => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    params.set('cat', next)
    navigate({ pathname: '/sell/new', hash: `#${params.toString()}` })
  }
  const setDuration = (next: (typeof DURATIONS)[number]) => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    params.set('dur', String(next))
    navigate({ pathname: '/sell/new', hash: `#${params.toString()}` })
  }
  const [photos, setPhotos] = useState<{ dataUrl: string; file: File }[]>([])
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingBid, setStartingBid] = useState(100)
  const [reserve, setReserve] = useState<number | ''>('')
  const [buyNow, setBuyNow] = useState<number | ''>('')
  const [submitStatus, setSubmitStatus] = useState<{
    kind: 'idle' | 'pending' | 'error'
    message?: string
  }>({ kind: 'idle' })

  const handleAddPhoto = () => {
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setPhotoUploadError(null)
    const remaining = Math.max(0, 8 - photos.length)
    const accepted = files.slice(0, remaining)
    const tooLarge: string[] = []
    Promise.all(
      accepted.map(
        (file) =>
          new Promise<{ dataUrl: string; file: File } | null>((resolve) => {
            if (file.size > 10 * 1024 * 1024) {
              tooLarge.push(file.name)
              resolve(null)
              return
            }
            const reader = new FileReader()
            reader.onload = () => resolve({ dataUrl: String(reader.result ?? ''), file })
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          }),
      ),
    ).then((results) => {
      const cleaned = results.filter((r): r is { dataUrl: string; file: File } => r !== null)
      if (cleaned.length > 0) {
        setPhotos((prev) => [...prev, ...cleaned])
      }
      if (tooLarge.length > 0) {
        setPhotoUploadError(
          t(
            'sellListing.photoTooLarge',
            { name: tooLarge[0] },
            {
              defaultValue: `${tooLarge[0]} is larger than 10 MB and was skipped.`,
            },
          ),
        )
      }
    })
  }

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (submitStatus.kind === 'pending') return
    if (!title.trim()) {
      setSubmitStatus({
        kind: 'error',
        message: t(
          'sellListing.titleRequired',
          {},
          { defaultValue: 'Add a title before listing.' },
        ),
      })
      return
    }
    setSubmitStatus({ kind: 'pending' })
    http
      .post<{ id?: string }>('/api/listings', {
        title,
        description,
        category,
        startingPrice: startingBid,
        reservePrice: reserve === '' ? undefined : Number(reserve),
        buyNowPrice: buyNow === '' ? undefined : Number(buyNow),
        duration: duration * 24,
      })
      .then(async (res) => {
        const newId = (res.data as { id?: string } | undefined)?.id
        // Domain analytics — the listing went live; fire-and-forget.
        track({
          name: 'auction.created',
          properties: {
            listingId: newId ?? null,
            category,
            durationDays: duration,
            hasReserve: reserve !== '',
            hasBuyNow: buyNow !== '',
          },
        })
        if (newId && photos.length > 0) {
          for (const p of photos) {
            try {
              await http.post(`/api/listings/${newId}/images`, { image: p.dataUrl })
            } catch (_error) {
              // safe to ignore: per-photo upload failure should not block listing creation
            }
          }
        }
        navigate(newId ? `/auctions/${newId}` : '/seller', { replace: true })
      })
      .catch((err: unknown) => {
        setSubmitStatus({
          kind: 'error',
          message:
            err instanceof Error
              ? err.message
              : t('sellListing.submitError', {}, { defaultValue: 'Could not create listing.' }),
        })
      })
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.stack(2)}>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('sellListing.eyebrow', {}, { defaultValue: 'Create listing' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('sellListing.heading', {}, { defaultValue: 'Sell an item' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-2xl')}>
          {t(
            'sellListing.subheading',
            {},
            {
              defaultValue:
                'Free appraisals on lots over $1,000. Most listings go live within 24 hours of submission.',
            },
          )}
        </p>
      </header>

      <form className={cm.cn(cm.stack(8))} onSubmit={handleSubmit}>
        {/* Photos */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <header className={cm.stack(1)}>
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
              {t('sellListing.photosHeading', {}, { defaultValue: 'Photos' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'sellListing.photosHint',
                {},
                {
                  defaultValue:
                    'Add up to 8 high-resolution photos. Listings with 4+ photos win 38% more bids.',
                },
              )}
            </p>
          </header>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            data-testid="photo-input"
            className={cm.cn('sr-only')}
            aria-label={t('sellListing.photoInput', {}, { defaultValue: 'Choose listing photos' })}
            onChange={handleFilesSelected}
          />
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
            {photos.map((p, idx) => (
              <div
                key={idx}
                className={cm.cn(
                  'aspect-square rounded-xl border-2 border-primary overflow-hidden relative',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-bid-panel), var(--mol-color-background-secondary))',
                }}
              >
                <img
                  src={p.dataUrl}
                  alt={t(
                    'sellListing.photoAlt',
                    { idx: idx + 1 },
                    { defaultValue: `Listing photo ${idx + 1}` },
                  )}
                  className={cm.cn('w-full h-full object-cover')}
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  aria-label={t(
                    'sellListing.removePhoto',
                    { idx: idx + 1 },
                    { defaultValue: `Remove photo ${idx + 1}` },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'absolute top-1 right-1 w-7 h-7 rounded-full text-white',
                  )}
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
            ))}
            {photos.length < 8 ? (
              <button
                type="button"
                onClick={handleAddPhoto}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'aspect-square rounded-xl border-2 border-dashed transition-colors',
                  'border-outline-variant hover:border-primary',
                )}
                aria-label={t('sellListing.addPhotoCta', {}, { defaultValue: 'Add photos' })}
              >
                <span className={cm.cn('flex flex-col items-center gap-1 text-on-surface-variant')}>
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    add_a_photo
                  </span>
                  <span className={cm.cn('text-xs font-semibold')}>
                    {t('common.add', {}, { defaultValue: 'Add' })}
                  </span>
                </span>
              </button>
            ) : null}
          </div>
          {photoUploadError ? (
            <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
              {photoUploadError}
            </p>
          ) : null}
        </section>

        {/* Title + description + category */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(5),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('sellListing.detailsHeading', {}, { defaultValue: 'Listing details' })}
          </h2>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.title', {}, { defaultValue: 'Title' })}
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(
                'sellListing.titlePlaceholder',
                {},
                { defaultValue: 'A short, descriptive title' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg border border-outline-variant bg-surface text-base font-semibold focus:outline-none focus:border-primary',
              )}
            />
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.description', {}, { defaultValue: 'Description' })}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={t(
                'sellListing.descriptionPlaceholder',
                {},
                {
                  defaultValue:
                    'Provenance, condition, recent service, signed paperwork, original kit…',
                },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-lg border border-outline-variant bg-surface text-sm leading-relaxed focus:outline-none focus:border-primary',
              )}
            />
          </label>
          <div
            className={cm.stack(2)}
            role="group"
            aria-label={t('form.category', {}, { defaultValue: 'Category' })}
          >
            <span
              className={cm.cn(
                'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.category', {}, { defaultValue: 'Category' })}
            </span>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              {CATEGORIES.map((c) => {
                const active = c.key === category
                const label = t(
                  `sellListing.category.${c.key}`,
                  {},
                  { defaultValue: c.defaultLabel },
                )
                if (active) {
                  return (
                    <span
                      key={c.key}
                      aria-current="true"
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        'rounded-full text-sm font-semibold border text-white border-transparent',
                      )}
                      style={{
                        background:
                          'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                      }}
                    >
                      {label}
                    </span>
                  )
                }
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'rounded-full text-sm font-semibold border transition-colors',
                      'border-outline-variant text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(5),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('sellListing.pricingHeading', {}, { defaultValue: 'Pricing' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-3')}>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sellListing.startingBidLabel', {}, { defaultValue: 'Starting bid (USD)' })}
              </span>
              <input
                type="number"
                value={startingBid}
                onChange={(e) => setStartingBid(Number(e.target.value))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-lg border border-outline-variant text-base font-semibold tabular-nums focus:outline-none focus:border-primary',
                )}
              />
            </label>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sellListing.reserveLabel', {}, { defaultValue: 'Reserve (optional)' })}
              </span>
              <input
                type="number"
                value={reserve}
                onChange={(e) => setReserve(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t(
                  'sellListing.reservePlaceholder',
                  {},
                  { defaultValue: 'No reserve' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-lg border border-outline-variant text-base font-semibold tabular-nums focus:outline-none focus:border-primary',
                )}
              />
            </label>
            <label className={cm.stack(2)}>
              <span
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sellListing.buyNowLabel', {}, { defaultValue: 'Buy now (optional)' })}
              </span>
              <input
                type="number"
                value={buyNow}
                onChange={(e) => setBuyNow(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t(
                  'sellListing.buyNowPlaceholder',
                  {},
                  { defaultValue: 'Disable buy-now' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-lg border border-outline-variant text-base font-semibold tabular-nums focus:outline-none focus:border-primary',
                )}
              />
            </label>
          </div>
        </section>

        {/* Duration */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-xl bg-surface border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
            {t('form.duration', {}, { defaultValue: 'Duration' })}
          </h2>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {DURATIONS.map((d) => {
              const active = d === duration
              const label = t(
                'sellListing.durationDays',
                { count: d },
                { defaultValue: '{{count}} days' },
              )
              if (active) {
                return (
                  <span
                    key={d}
                    aria-current="true"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      'rounded-xl text-sm font-semibold border text-white border-transparent shadow-sm shadow-primary/30',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                    }}
                  >
                    {label}
                  </span>
                )
              }
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    'rounded-xl text-sm font-semibold border transition-all',
                    'border-outline-variant text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        {submitStatus.message ? (
          <p
            role="status"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-lg text-sm font-semibold',
              submitStatus.kind === 'error'
                ? 'text-error bg-error/10'
                : 'text-on-surface-variant bg-surface-container-low',
            )}
          >
            {submitStatus.message}
          </p>
        ) : null}

        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'sellListing.feeNotice',
              { fee: '8%' },
              {
                defaultValue:
                  'Final value fee: {{fee}} of sale price. Includes payment processing.',
              },
            )}
          </p>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              disabled={submitStatus.kind === 'pending'}
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 3),
                'rounded-full text-sm font-bold text-white shadow-md shadow-primary/30 disabled:opacity-60',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
              }}
            >
              {submitStatus.kind === 'pending'
                ? t('sellListing.submitting', {}, { defaultValue: 'Listing…' })
                : t('sellListing.submit', {}, { defaultValue: 'Preview & list' })}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default SellListing

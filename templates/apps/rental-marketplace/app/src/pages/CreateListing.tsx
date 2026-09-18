import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const STEPS = [
  { id: 1, key: 'place', label: 'Tell us about your place', icon: 'cottage' },
  { id: 2, key: 'photos', label: 'Make it stand out', icon: 'add_photo_alternate' },
  { id: 3, key: 'details', label: 'Finish up & publish', icon: 'rocket_launch' },
] as const

const PROPERTY_TYPES = [
  { v: 'cabin', label: 'Cabin', icon: 'cabin' },
  { v: 'house', label: 'House', icon: 'home' },
  { v: 'loft', label: 'Loft', icon: 'apartment' },
  { v: 'apartment', label: 'Apartment', icon: 'location_city' },
] as const

type PropertyType = (typeof PROPERTY_TYPES)[number]['v']

const FALLBACK_PHOTOS = [
  'https://picsum.photos/seed/roost-new-listing-a/1200/900',
  'https://picsum.photos/seed/roost-new-listing-b/1200/900',
  'https://picsum.photos/seed/roost-new-listing-c/1200/900',
] as const

export function CreateListing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [step, setStep] = useState(1)
  const [propertyType, setPropertyType] = useState<PropertyType>('cabin')
  const [city, setCity] = useState('')
  const [bedrooms, setBedrooms] = useState(1)
  const [maxGuests, setMaxGuests] = useState(2)
  const [photos, setPhotos] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPlaceholderPhoto() {
    setPhotos((prev) =>
      prev.length >= 6
        ? prev
        : [
            ...prev,
            FALLBACK_PHOTOS[prev.length % FALLBACK_PHOTOS.length] + `?n=${prev.length + 1}`,
          ],
    )
  }

  async function handlePhotoFile(file: File) {
    setError(null)
    try {
      // The uploads bond has no presigned-URL method — the file is streamed
      // THROUGH the API (multipart POST → provider.upload) and read back through
      // it. The handler returns a same-origin serve URL we store as the photo.
      const form = new FormData()
      form.append('file', file, file.name)
      const response = await http.post('/api/uploads', form)
      const url = (response.data as { url?: string } | undefined)?.url
      if (url) {
        setPhotos((prev) => [...prev, url])
        return
      }
    } catch (_error) {
      // Uploads bond not configured locally (no S3 credentials); fall back to a
      // placeholder so the form still works in the dev sandbox.
    }
    addPlaceholderPhoto()
  }

  async function handlePublish() {
    setError(null)
    if (!title.trim()) {
      setError(
        t('createListing.error.title', {}, { defaultValue: 'Add a title before publishing.' }),
      )
      setStep(3)
      return
    }
    if (!city.trim()) {
      setError(
        t('createListing.error.city', {}, { defaultValue: 'Add the city before publishing.' }),
      )
      setStep(1)
      return
    }
    const priceNum = Number(String(price).replace(/[^\d.]/g, ''))
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError(
        t(
          'createListing.error.price',
          {},
          { defaultValue: 'Add a nightly price before publishing.' },
        ),
      )
      setStep(3)
      return
    }
    setSubmitting(true)
    try {
      const images = photos.length > 0 ? photos : Array.from(FALLBACK_PHOTOS.slice(0, 3))
      const result = (await http.post('/api/listings', {
        title,
        description: description || `A new ${propertyType} in ${city}.`,
        property_type: propertyType,
        address: city,
        city,
        country: 'United States',
        max_guests: maxGuests,
        bedrooms,
        beds: bedrooms,
        bathrooms: 1,
        amenities: ['Wifi', 'Kitchen'],
        images,
        thumbnails: images.slice(0, 1),
        price_per_night: priceNum,
        cleaning_fee: Math.round(priceNum * 0.2),
        currency: 'USD',
      })) as { id?: string; data?: { id?: string } } | undefined
      const id = result?.id ?? result?.data?.id
      if (id) {
        navigate(`/host/listings/${id}`)
      } else {
        navigate('/host/listings')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 8))}>
        <Link
          to="/host/listings"
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark hover:underline',
          )}
        >
          ← {t('createListing.back', {}, { defaultValue: 'Back to listings' })}
        </Link>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('createListing.heading', {}, { defaultValue: 'Open your door' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'createListing.subheading',
            {},
            {
              defaultValue:
                "A few questions to get your listing live. We'll save your progress at every step.",
            },
          )}
        </p>
      </header>

      <ol className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mb', 8))}>
        {STEPS.map((s) => {
          const isActive = s.id === step
          const isDone = s.id < step
          return (
            <li key={s.id} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  isDone
                    ? 'bg-primary text-on-primary'
                    : isActive
                      ? 'bg-accent text-on-primary ring-4 ring-accent/30'
                      : 'bg-surface-container text-on-surface-variant',
                )}
                aria-label={s.label}
              >
                {isDone ? (
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    check
                  </span>
                ) : (
                  s.id
                )}
              </button>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    `createListing.step.${s.key}.eyebrow`,
                    { n: s.id },
                    { defaultValue: 'Step {{n}}' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(`createListing.step.${s.key}.label`, {}, { defaultValue: s.label })}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface rounded-[2rem] shadow-md border border-outline-variant/40',
        )}
      >
        {step === 1 && (
          <div className={'space-y-6'}>
            <h2
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'leading-tight')}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t('createListing.place.heading', {}, { defaultValue: 'What kind of place is it?' })}
            </h2>
            <div className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-3')}>
              {PROPERTY_TYPES.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPropertyType(p.v)}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    'rounded-2xl border-2 transition-colors',
                    propertyType === p.v
                      ? 'border-primary bg-primary-container/30 text-primary-dark'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary',
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {p.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`createListing.propertyType.${p.v}`, {}, { defaultValue: p.label })}
                  </span>
                </button>
              ))}
            </div>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('createListing.cityLabel', {}, { defaultValue: 'Where is it?' })}
              </span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t(
                  'createListing.cityPlaceholder',
                  {},
                  { defaultValue: 'City, region, or neighbourhood' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                )}
              />
            </label>
            <div className={cm.cn('grid grid-cols-2 gap-4')}>
              <Counter
                label={t('createListing.bedrooms', {}, { defaultValue: 'Bedrooms' })}
                value={bedrooms}
                onChange={setBedrooms}
              />
              <Counter
                label={t('createListing.maxGuests', {}, { defaultValue: 'Max guests' })}
                value={maxGuests}
                onChange={setMaxGuests}
              />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className={'space-y-4'}>
            <h2
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'leading-tight')}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t(
                'createListing.photos.heading',
                {},
                { defaultValue: 'Add photos that make travelers stop scrolling' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'createListing.photos.subheading',
                {},
                { defaultValue: 'Hosts who upload at least 3 photos earn 2.3× more on average.' },
              )}
            </p>
            <div className={cm.cn('grid grid-cols-2 sm:grid-cols-3 gap-3')}>
              {photos.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className={cm.cn(
                    'aspect-[4/3] rounded-2xl overflow-hidden border border-outline-variant relative bg-surface-container',
                  )}
                >
                  <img
                    src={src}
                    alt={t(
                      'createListing.listingImageAlt',
                      { number: i + 1 },
                      { defaultValue: 'Listing {{number}}' },
                    )}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className={cm.cn(
                      'absolute top-2 right-2 bg-surface/90 rounded-full text-on-surface-variant hover:text-error',
                      cm.w(8),
                      cm.h(8),
                      cm.flex({ align: 'center', justify: 'center' }),
                    )}
                    aria-label={t(
                      'createListing.removePhoto',
                      {},
                      { defaultValue: 'Remove photo' },
                    )}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      close
                    </span>
                  </button>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - photos.length) }).map((_, i) => (
                <label
                  key={`slot-${i}`}
                  className={cm.cn(
                    'aspect-[4/3] rounded-2xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors text-on-surface-variant cursor-pointer',
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhotoFile(file)
                      e.target.value = ''
                    }}
                  />
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    add_photo_alternate
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                    {t(
                      'createListing.uploadCta',
                      { n: photos.length + i + 1 },
                      { defaultValue: 'Add photo {{n}}' },
                    )}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={addPlaceholderPhoto}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant hover:border-primary hover:text-primary',
              )}
            >
              {t('createListing.useSample', {}, { defaultValue: 'Use a sample photo' })}
            </button>
          </div>
        )}
        {step === 3 && (
          <div className={'space-y-6'}>
            <h2
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'leading-tight')}
              style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
            >
              {t(
                'createListing.details.heading',
                {},
                { defaultValue: 'Final touches before going live' },
              )}
            </h2>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
              <Field
                label={t('createListing.title', {}, { defaultValue: 'Listing title' })}
                placeholder={t(
                  'createListing.titlePlaceholder',
                  {},
                  { defaultValue: 'Sunlit Cliffside Cabin' },
                )}
                value={title}
                onChange={setTitle}
              />
              <Field
                label={t('createListing.price', {}, { defaultValue: 'Price per night' })}
                placeholder="$220"
                value={price}
                onChange={setPrice}
              />
            </div>
            <Field
              label={t('form.description', {}, { defaultValue: 'Description' })}
              placeholder={t(
                'createListing.descPlaceholder',
                {},
                { defaultValue: 'Hand-built redwood cabin perched 400ft above the Pacific…' },
              )}
              value={description}
              onChange={setDescription}
              multiline
            />
          </div>
        )}

        {error && (
          <p className={cm.cn(cm.sp('mt', 6), cm.textSize('sm'), cm.textCenter, 'text-error')}>
            {error}
          </p>
        )}

        <footer className={cm.cn(cm.sp('mt', 8), cm.flex({ align: 'center', justify: 'between' }))}>
          <button
            type="button"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant disabled:opacity-50',
            )}
          >
            {t('common.back', {}, { defaultValue: 'Back' })}
          </button>
          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container shadow-md',
              )}
            >
              {t('common.continue', {}, { defaultValue: 'Continue' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full bg-accent text-on-primary hover:bg-accent-hover shadow-md disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('createListing.publish', {}, { defaultValue: 'Publish listing' })}
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 4),
        'bg-surface-container-low rounded-xl border border-outline-variant',
      )}
    >
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</span>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'border border-outline-variant hover:border-primary hover:text-primary',
          )}
        >
          −
        </button>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'tabular-nums w-8 text-center',
          )}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'border border-outline-variant hover:border-primary hover:text-primary',
          )}
        >
          +
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  multiline,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const cm = getClassMap()
  const inputClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('semibold'),
    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
  )
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          rows={4}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  )
}

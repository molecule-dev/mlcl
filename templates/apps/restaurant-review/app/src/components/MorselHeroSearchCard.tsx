/**
 * Landing hero for Morsel — the design's light editorial split: an italic
 * Newsreader headline ("Every bite tells a story") over a white quick-search
 * pill on the left, and a rotated polaroid stack over a warm blurred blob on
 * the right.
 *
 * Functionally identical to the earlier crimson-panel hero: the same
 * cuisine / neighborhood / price / party form drives the same
 * `navigate('/discover?…')` search. Only the presentation changed.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any price' },
  { value: '1', label: '$' },
  { value: '2', label: '$$' },
  { value: '3', label: '$$$' },
  { value: '4', label: '$$$$' },
] as const

const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 8] as const

/* Polaroid stack — the design's tilted food photos. Images use the app's
   picsum-seed convention (the design's googleusercontent shots are
   deliberately not hot-linked). */
const POLAROIDS = [
  {
    key: 'greenery',
    defaultCaption: 'The Greenery',
    seed: 'morsel-polaroid-salad',
    size: 'w-44 h-44 sm:w-48 sm:h-48',
    wrap: 'top-4 left-6 -rotate-6 z-10',
  },
  {
    key: 'mornings',
    defaultCaption: 'Morning Rituals',
    seed: 'morsel-polaroid-toast',
    size: 'w-48 h-48 sm:w-56 sm:h-56',
    wrap: 'top-1/3 right-2 rotate-3 z-20',
  },
  {
    key: 'nonnas',
    defaultCaption: "Nonna's",
    seed: 'morsel-polaroid-pasta',
    size: 'w-44 h-44 sm:w-52 sm:h-52',
    wrap: 'bottom-6 left-1/4 -rotate-2 z-30',
  },
] as const

export function MorselHeroSearchCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [cuisine, setCuisine] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [price, setPrice] = useState<string>('any')
  const [party, setParty] = useState<number>(2)

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (cuisine) q.set('q', cuisine)
    if (neighborhood) q.set('near', neighborhood)
    if (price !== 'any') q.set('price', price)
    q.set('party', String(party))
    navigate(`/discover?${q.toString()}`)
  }

  const fieldLabel = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'uppercase tracking-wider text-on-surface-variant mb-1',
  )
  const fieldInput = cm.cn(
    cm.textSize('base'),
    'w-full bg-transparent border-0 outline-none p-0 text-on-surface placeholder:text-on-surface-variant/50',
  )

  return (
    <section className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-12 items-center')}>
      <div className={cm.cn('relative z-10')}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 4),
            cm.flex({ align: 'center', gap: 'sm' }),
            'tracking-[0.3em] uppercase text-accent-on-surface',
          )}
        >
          <span
            className={'material-symbols-outlined text-base'}
            aria-hidden="true"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            local_dining
          </span>
          {t('morselHeroSearchCard.eyebrow', {}, { defaultValue: "Tonight's appetite, decoded" })}
        </span>
        <h1
          className={cm.cn(
            cm.sp('mb', 6),
            'text-5xl md:text-6xl lg:text-7xl italic leading-tight tracking-tight font-display text-on-surface',
          )}
        >
          {t('morselHeroSearchCard.title', {}, { defaultValue: 'Every bite tells a story.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.sp('mb', 10),
            cm.maxW('md'),
            'text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'morselHeroSearchCard.subtitle',
            {},
            {
              defaultValue:
                'Honest reviews from neighbors who actually showed up — pair them with curated lists, photos straight from the table, and menus that get to the point.',
            },
          )}
        </p>

        {/* Quick-search pill — white card, design's rounded shadow treatment */}
        <form
          onSubmit={search}
          className={cm.cn(
            cm.sp('p', 2),
            'bg-surface border border-outline-variant/50 rounded-3xl shadow-xl shadow-on-surface/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2',
          )}
        >
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'flex flex-col flex-1 sm:border-r border-outline-variant/40',
            )}
          >
            <span className={fieldLabel}>
              {t('morselHeroSearchCard.cuisineLabel', {}, { defaultValue: 'Cuisine or dish' })}
            </span>
            <input
              type="text"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder={t(
                'morselHeroSearchCard.cuisinePlaceholder',
                {},
                { defaultValue: 'Pizza, ramen, brunch…' },
              )}
              className={fieldInput}
              aria-label={t(
                'morselHeroSearchCard.cuisineAria',
                {},
                { defaultValue: 'Cuisine or dish' },
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'flex flex-col flex-1 sm:border-r border-outline-variant/40',
            )}
          >
            <span className={fieldLabel}>
              {t('morselHeroSearchCard.neighborhoodLabel', {}, { defaultValue: 'Near' })}
            </span>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder={t(
                'morselHeroSearchCard.neighborhoodPlaceholder',
                {},
                { defaultValue: 'Neighborhood, city…' },
              )}
              className={fieldInput}
              aria-label={t(
                'morselHeroSearchCard.neighborhoodAria',
                {},
                { defaultValue: 'Neighborhood' },
              )}
            />
          </label>
          <label
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'flex flex-col flex-1 sm:border-r border-outline-variant/40',
            )}
          >
            <span className={fieldLabel}>{t('form.price', {}, { defaultValue: 'Price' })}</span>
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={cm.cn(fieldInput, cm.fontWeight('semibold'))}
              aria-label={t('morselHeroSearchCard.priceAria', {}, { defaultValue: 'Price level' })}
            >
              {PRICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(
                    `morselHeroSearchCard.priceOption.${opt.value}`,
                    {},
                    { defaultValue: opt.label },
                  )}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'flex flex-col flex-1')}>
            <span className={fieldLabel}>
              {t('morselHeroSearchCard.partyLabel', {}, { defaultValue: 'Party' })}
            </span>
            <select
              value={party}
              onChange={(e) => setParty(Number(e.target.value))}
              className={cm.cn(fieldInput, cm.fontWeight('semibold'))}
              aria-label={t('morselHeroSearchCard.partyAria', {}, { defaultValue: 'Party size' })}
            >
              {PARTY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t('morselHeroSearchCard.partyOption', { n }, { defaultValue: '{{n}} people' })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            data-mol-id="hero-search-submit"
            aria-label={t('morselHeroSearchCard.submit', {}, { defaultValue: 'Find a table' })}
            className={cm.cn(
              cm.sp('p', 4),
              'sm:ml-1 shrink-0 bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors flex items-center justify-center hover:scale-105',
            )}
          >
            <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
              search
            </span>
          </button>
        </form>

        <div
          className={cm.cn(
            'relative z-10',
            cm.sp('mt', 6),
            cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-accent-on-surface"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            {t(
              'morselHeroSearchCard.trustReal',
              {},
              { defaultValue: 'Real diners, verified visits' },
            )}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span className="material-symbols-outlined text-accent-on-surface" aria-hidden="true">
              photo_camera
            </span>
            {t(
              'morselHeroSearchCard.trustPhotos',
              {},
              { defaultValue: 'Photos from the table, not the press kit' },
            )}
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span className="material-symbols-outlined text-accent-on-surface" aria-hidden="true">
              favorite
            </span>
            {t(
              'morselHeroSearchCard.trustLists',
              {},
              { defaultValue: 'Curated lists from local foodies' },
            )}
          </div>
        </div>
      </div>

      {/* Polaroid stack — decorative; hidden below lg like the design */}
      <div className={cm.cn('relative h-[480px] hidden lg:block')} aria-hidden="true">
        <div
          className={cm.cn(
            'absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 bg-surface-secondary rounded-full blur-3xl opacity-70',
          )}
        />
        {POLAROIDS.map((p) => (
          <figure
            key={p.key}
            className={cm.cn(
              'absolute bg-surface p-2 pb-7 shadow-lg rounded-sm',
              p.wrap,
              'transition-transform hover:scale-105 duration-300',
            )}
          >
            <img
              alt=""
              src={`https://picsum.photos/seed/${p.seed}/480/480`}
              className={cm.cn(p.size, 'object-cover rounded-[2px] mb-2')}
              loading="lazy"
            />
            <figcaption
              className={cm.cn('font-display italic text-center text-sm text-on-surface')}
            >
              {t(`morselHeroSearchCard.polaroid.${p.key}`, {}, { defaultValue: p.defaultCaption })}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

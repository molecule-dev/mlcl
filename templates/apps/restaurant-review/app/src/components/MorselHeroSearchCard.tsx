/**
 * Gradient hero card with embedded restaurant-search form for the Landing
 * page — `from-primary` Morsel crimson (#c0392b) to `primary-container`
 * warm rust, 2rem rounded radii, decorative blurred orbs, frosted-glass
 * search bar, and a serif appetite-first headline in the brand
 * `DM Serif Display` family.
 *
 * Translated from hotel-booking's SojournHeroSearchCard.tsx (gradient
 * brand-panel + decorative orbs + search-form overlay), with copy and
 * iconography swapped for restaurant discovery (cuisine + neighborhood
 * + price level + party size) and an editorial accent strip — the
 * "tonight's appetite" eyebrow — that frames Morsel's voice.
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

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        cm.flex({ direction: 'col', justify: 'between' }),
        'min-h-[520px] bg-gradient-to-br from-primary via-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-24 -top-24 bg-accent/30 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(64),
          cm.h(64),
          cm.roundedFull,
          'absolute -left-20 -bottom-20 bg-surface/15 blur-3xl',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10', cm.maxW('2xl'))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 4),
            cm.flex({ align: 'center', gap: 'sm' }),
            'tracking-[0.3em] uppercase text-accent-on-primary',
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
            cm.sp('mb', 4),
            'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95]',
          )}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {t('morselHeroSearchCard.title', {}, { defaultValue: 'Every bite tells a story.' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/90 leading-relaxed')}>
          {t(
            'morselHeroSearchCard.subtitle',
            {},
            {
              defaultValue:
                'Honest reviews from neighbors who actually showed up — pair them with curated lists, photos straight from the table, and menus that get to the point.',
            },
          )}
        </p>
      </div>

      <form
        onSubmit={search}
        className={cm.cn(
          cm.sp('p', 3),
          cm.sp('mt', 8),
          'relative z-10 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_0.9fr_0.8fr_auto] gap-2 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl text-on-surface',
        )}
      >
        <label className={cm.cn(cm.sp('px', 4), cm.sp('py', 2), 'flex flex-col')}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
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
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none placeholder:text-on-surface-variant/60',
            )}
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
            'flex flex-col border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
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
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none placeholder:text-on-surface-variant/60',
            )}
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
            'flex flex-col border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.price', {}, { defaultValue: 'Price' })}
          </span>
          <select
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
            )}
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
        <label
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'flex flex-col border-l border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('morselHeroSearchCard.partyLabel', {}, { defaultValue: 'Party' })}
          </span>
          <select
            value={party}
            onChange={(e) => setParty(Number(e.target.value))}
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'bg-transparent border-0 outline-none',
            )}
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
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
            'bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shadow-lg',
          )}
        >
          <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
            search
          </span>
          {t('morselHeroSearchCard.submit', {}, { defaultValue: 'Find a table' })}
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
            'text-white/85',
          )}
        >
          <span
            className="material-symbols-outlined text-accent"
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
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
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
            'text-white/85',
          )}
        >
          <span className="material-symbols-outlined text-accent" aria-hidden="true">
            favorite
          </span>
          {t(
            'morselHeroSearchCard.trustLists',
            {},
            { defaultValue: 'Curated lists from local foodies' },
          )}
        </div>
      </div>
    </section>
  )
}

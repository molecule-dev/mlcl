import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Landing-page hero — gradient backdrop, oversize display headline, large
 * pill search bar with category quick-filters, and inline social-proof
 * stats. Decorative blurred orbs in corners.
 *
 * Translated from personal-finance NetWorthCard (gradient + corner orbs)
 * and lms WelcomeBanner (gradient overlay + tagline copy).
 */

const CATEGORIES = [
  { key: 'math', icon: 'calculate', label: 'Math' },
  { key: 'science', icon: 'science', label: 'Science' },
  { key: 'languages', icon: 'translate', label: 'Languages' },
  { key: 'testPrep', icon: 'menu_book', label: 'Test prep' },
  { key: 'music', icon: 'music_note', label: 'Music' },
  { key: 'coding', icon: 'code', label: 'Coding' },
] as const

export function HeroSearchSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
  }

  const handleCategory = (key: string) => {
    navigate(`/search?subject=${encodeURIComponent(key)}`)
  }

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-violet text-on-primary',
        cm.sp('px', 8),
        cm.sp('py', 16),
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-32 -top-32 w-[28rem] h-[28rem] rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -left-24 -bottom-32 w-[24rem] h-[24rem] rounded-full bg-secondary/25 blur-3xl',
        )}
      />

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          'relative z-10 mx-auto w-full max-w-5xl',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'rounded-full bg-surface/15 backdrop-blur-md px-4 py-1.5 uppercase tracking-widest',
          )}
        >
          {t(
            'heroSearchSection.eyebrow',
            {},
            { defaultValue: '12,000+ verified tutors • since 2018' },
          )}
        </span>
        <h1
          className={cm.cn(
            cm.textCenter,
            cm.fontWeight('bold'),
            'font-display text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] max-w-4xl',
          )}
        >
          {t(
            'heroSearchSection.headline',
            {},
            { defaultValue: 'Where curious minds meet the right tutors.' },
          )}
        </h1>
        <p
          className={cm.cn(
            cm.textCenter,
            cm.textSize('lg'),
            cm.sp('mt', 6),
            cm.maxW('xl'),
            'opacity-90',
          )}
        >
          {t(
            'heroSearchSection.subhead',
            {},
            {
              defaultValue: 'Verified tutors. Clear pricing. Sessions that fit your week.',
            },
          )}
        </p>

        <form
          onSubmit={handleSearch}
          className={cm.cn(
            'relative w-full max-w-2xl mt-10 bg-surface rounded-full shadow-2xl overflow-hidden',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn(
              'material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-primary',
            )}
          >
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'heroSearchSection.searchPlaceholder',
              {},
              { defaultValue: 'Search subjects, tutors, or topics…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.textSize('base'),
              'pl-16 pr-36 py-5 bg-transparent text-on-surface placeholder:text-on-surface-variant focus:outline-none',
            )}
          />
          <button
            type="submit"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-secondary px-6 py-3 text-on-secondary transition-colors hover:bg-secondary-dark',
            )}
          >
            {t('heroSearchSection.searchCta', {}, { defaultValue: 'Find tutor' })}
          </button>
        </form>

        <div
          className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center', gap: 'sm' }), cm.sp('mt', 6))}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleCategory(cat.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-full px-4 py-2 bg-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                {cat.icon}
              </span>
              {t(`heroSearchSection.category.${cat.key}`, {}, { defaultValue: cat.label })}
            </button>
          ))}
        </div>

        <div
          className={cm.cn(
            cm.flex({ wrap: 'wrap', justify: 'center', gap: 'lg' }),
            cm.sp('mt', 12),
          )}
        >
          {[
            {
              value: '12K+',
              label: t('heroSearchSection.stat.tutors', {}, { defaultValue: 'Verified tutors' }),
            },
            {
              value: '50+',
              label: t('heroSearchSection.stat.subjects', {}, { defaultValue: 'Subjects covered' }),
            },
            {
              value: '4.9★',
              label: t('heroSearchSection.stat.rating', {}, { defaultValue: 'Avg session rating' }),
            },
            {
              value: '1.2M',
              label: t(
                'heroSearchSection.stat.sessions',
                {},
                { defaultValue: 'Sessions delivered' },
              ),
            },
          ].map((stat) => (
            <div key={stat.label} className={cm.textCenter}>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'font-display text-3xl md:text-4xl tracking-tight tabular-nums',
                )}
              >
                {stat.value}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'opacity-80 uppercase tracking-widest mt-1',
                )}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroSearchSection

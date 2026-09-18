import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { HeroSearchSection } from '../components/HeroSearchSection.js'
import { ReviewCard } from '../components/ReviewCard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { TutorCard } from '../components/TutorCard.js'

type TutorRow = {
  id: string
  display_name?: string
  name?: string
  headline?: string
  bio?: string
  hourly_rate?: number
  rate_per_hour_cents?: number
  rating_average?: number | string
  rating_count?: number
  session_count?: number
  subjects?: string[]
  subject?: string
  verified?: boolean
  avatar_url?: string
}

// Demo tutor UUIDs match the seed migration in
// api/migrations/0011_seed_demo_tutors.sql so featured cards link to real
// tutor profiles in the database (not 404).
const FEATURED_TUTORS_FALLBACK = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Dr. Maya Rivera',
    avatarSeed: 'demo-rivera',
    headline: 'PhD physics. Builds intuition from first principles.',
    subjects: ['Physics', 'Calculus', 'AP Physics C', 'IB HL'],
    ratePerHour: 95,
    rating: 4.95,
    reviewCount: 312,
    verified: true,
    topRated: true,
    online: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Adaeze Okafor',
    avatarSeed: 'demo-okafor',
    headline: 'Bilingual writing coach for IELTS, TOEFL & college essays.',
    subjects: ['English', 'IELTS', 'TOEFL', 'Essay coaching'],
    ratePerHour: 60,
    rating: 4.88,
    reviewCount: 184,
    verified: true,
    online: false,
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Kenji Tanaka',
    avatarSeed: 'demo-tanaka',
    headline: 'Software engineer turned tutor — Python, algorithms, ML.',
    subjects: ['Python', 'Algorithms', 'Machine learning'],
    ratePerHour: 110,
    rating: 4.92,
    reviewCount: 247,
    verified: true,
    topRated: true,
    online: true,
  },
] as const

const FEATURE_PILLARS = [
  {
    icon: 'verified',
    title: 'Verified expertise',
    body: 'Every tutor passes ID, credentials, and a teaching demo before they appear.',
  },
  {
    icon: 'event_available',
    title: 'Flexible scheduling',
    body: 'Pick a slot that fits your week. Reschedule up to 12 hours before with no fee.',
  },
  {
    icon: 'shield',
    title: 'Money-back guarantee',
    body: 'Not the right fit? Your first session is on us — no questions asked.',
  },
] as const

const TESTIMONIALS = [
  {
    id: 'r1',
    reviewerName: 'Priya Patel',
    reviewerAvatarSeed: 'priya-patel',
    rating: 5,
    body: 'Dr. Rivera made calculus feel obvious. My SAT math went from 680 to 790 in six weeks.',
    postedAgo: '2 weeks ago',
    subject: 'AP Calculus BC',
  },
  {
    id: 'r2',
    reviewerName: 'Marcus Kim',
    reviewerAvatarSeed: 'marcus-kim',
    rating: 5,
    body: 'Booking was effortless. Adaeze gave my Common App essay a personality I didn’t know I had.',
    postedAgo: '1 month ago',
    subject: 'College essays',
  },
  {
    id: 'r3',
    reviewerName: 'Eun-Ji Lee',
    reviewerAvatarSeed: 'eunji-lee',
    rating: 5,
    body: 'Kenji explains data structures like a pro. I shipped my first graph algorithm after two sessions.',
    postedAgo: '3 weeks ago',
    subject: 'CS — algorithms',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [featured, setFeatured] = useState<TutorRow[] | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<TutorRow[]>(`/api/tutors?limit=3`)
      .then((res) => {
        if (!active) return
        const rows = (res as { data?: TutorRow[] | null }).data
        if (Array.isArray(rows) && rows.length > 0) {
          setFeatured(rows)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [http])

  const featuredCards =
    featured && featured.length > 0
      ? featured.map((t) => ({
          id: t.id,
          name: t.display_name ?? t.name ?? 'Tutor',
          avatarSeed: t.avatar_url ?? t.id,
          headline: t.headline ?? '',
          subjects: Array.isArray(t.subjects) ? t.subjects : t.subject ? [t.subject] : [],
          ratePerHour:
            typeof t.hourly_rate === 'number'
              ? t.hourly_rate
              : typeof t.rate_per_hour_cents === 'number'
                ? Math.round(t.rate_per_hour_cents / 100)
                : 0,
          rating: Number(t.rating_average ?? 0),
          reviewCount: t.rating_count ?? 0,
          verified: t.verified ?? false,
          topRated: false,
          online: false,
        }))
      : FEATURED_TUTORS_FALLBACK.map((t) => ({ ...t, subjects: [...t.subjects] }))

  return (
    <div className={cm.cn(cm.page, cm.flex({ direction: 'col' }))}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-30 backdrop-blur-md bg-surface/80 border-b border-outline-variant/30',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl shadow-md',
            )}
            style={{
              width: 36,
              height: 36,
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
            }}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-on-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_note
            </span>
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'font-display tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/search"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:inline text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('landing.nav.findTutors', {}, { defaultValue: 'Find tutors' })}
          </Link>
          <Link
            to="/become-tutor"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:inline text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t(
              'landing.nav.becomeTutor',
              { appName: APP_NAME },
              { defaultValue: 'Teach on {{appName}}' },
            )}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:inline text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full px-5 py-2 text-on-primary shadow-md hover:scale-[1.03] transition-transform',
              )}
              style={{ backgroundColor: 'var(--mol-color-primary)' }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full px-5 py-2 border border-outline-variant/40 hover:bg-surface-container transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full px-5 py-2 text-on-primary shadow-md hover:scale-[1.03] transition-transform',
                )}
                style={{ backgroundColor: 'var(--mol-color-primary)' }}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 10), cm.stack(16))}>
        <div className={cm.cn(cm.maxW('2xl'), 'mx-auto w-full')}>
          <HeroSearchSection />
        </div>

        <section className={cm.cn(cm.maxW('2xl'), 'mx-auto w-full')}>
          <div className={cm.cn(cm.textCenter, cm.maxW('xl'), 'mx-auto')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'landing.pillars.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Why {{appName}}' },
              )}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'font-display tracking-tight',
              )}
            >
              {t(
                'landing.pillars.headline',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}} — without the friction.' },
              )}
            </h2>
          </div>
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3', cm.sp('mt', 10))}
          >
            {FEATURE_PILLARS.map((p) => (
              <article
                key={p.title}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-xl w-12 h-12',
                  )}
                  style={{
                    backgroundColor: 'var(--chalk-booked-light)',
                    color: 'var(--mol-color-primary-dark)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {p.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    cm.sp('mt', 4),
                    'font-display tracking-tight',
                  )}
                >
                  {t(`landing.pillars.${p.icon}.title`, {}, { defaultValue: p.title })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {t(`landing.pillars.${p.icon}.body`, {}, { defaultValue: p.body })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('2xl'), 'mx-auto w-full')}>
          <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('landing.featured.eyebrow', {}, { defaultValue: 'Featured tutors' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 1),
                  'font-display tracking-tight',
                )}
              >
                {t(
                  'landing.featured.headline',
                  {},
                  { defaultValue: 'Hand-picked, top-rated, and ready this week.' },
                )}
              </h2>
            </div>
            <Link
              to="/search"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('landing.featured.viewAll', {}, { defaultValue: 'Browse all tutors' })}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
            {featuredCards.map((tutor) => (
              <TutorCard key={tutor.id} {...tutor} subjects={[...tutor.subjects]} />
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('2xl'), 'mx-auto w-full')}>
          <div className={cm.cn(cm.textCenter, cm.maxW('xl'), 'mx-auto')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.testimonials.eyebrow', {}, { defaultValue: 'From recent students' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'font-display tracking-tight',
              )}
            >
              {t(
                'landing.testimonials.headline',
                {},
                { defaultValue: 'Real outcomes, in their own words.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3', cm.sp('mt', 8))}>
            {TESTIMONIALS.map((review) => (
              <ReviewCard key={review.id} {...review} />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
            cm.sp('p', 12),
            cm.maxW('2xl'),
            'mx-auto w-full',
          )}
          style={{
            background:
              'linear-gradient(135deg, #0d9488 0%, var(--mol-color-primary) 60%, var(--mol-color-primary-dark) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
            )}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
              'relative z-10 flex-wrap',
            )}
          >
            <div className={cm.cn(cm.maxW('xl'), cm.stack(3))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest opacity-85',
                )}
              >
                {t('landing.tutorCta.eyebrow', {}, { defaultValue: 'Become a tutor' })}
              </p>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'font-display text-4xl md:text-5xl tracking-tight',
                )}
              >
                {t(
                  'landing.tutorCta.headline',
                  {},
                  { defaultValue: 'Earn doing what you love. Teach on your schedule.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'opacity-90')}>
                {t(
                  'landing.tutorCta.body',
                  {},
                  {
                    defaultValue:
                      'Set your own rates, build a reputation with verified reviews, and we handle scheduling, payments, and reminders.',
                  },
                )}
              </p>
            </div>
            <Link
              to="/become-tutor"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full px-8 py-4 bg-surface shadow-lg hover:scale-[1.03] transition-transform',
              )}
              style={{ color: 'var(--mol-color-primary-dark)' }}
            >
              {t('landing.tutorCta.button', {}, { defaultValue: 'Apply to teach' })}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

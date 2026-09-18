import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CategoryBubble } from '../components/CategoryBubble.js'
import { CourseTile } from '../components/CourseTile.js'
import { Footer } from '../components/Footer.js'
import { InstructorAvatarCard } from '../components/InstructorAvatarCard.js'
import { api, type Category, type CourseSummary, type Instructor } from '../lib/api.js'

// Stable emoji map for categories surfaced by the API. Keys are lowercased
// category names from /api/courses/categories. Anything not in the map falls
// back to a generic graduation-cap emoji so new categories don't break the UI.
const CATEGORY_EMOJI: Record<string, string> = {
  development: '💻',
  business: '📈',
  design: '🎨',
  marketing: '🚀',
  photography: '📷',
  music: '🎵',
  languages: '🌍',
  lifestyle: '🧘',
  'data science': '📊',
  general: '🎓',
}

function pickCategoryEmoji(name: string): string {
  return CATEGORY_EMOJI[name.toLowerCase()] ?? '🎓'
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useIsAuthenticated()
  const [featured, setFeatured] = useState<CourseSummary[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      api<CourseSummary[]>('/courses/featured').catch(() => []),
      api<Category[]>('/courses/categories').catch(() => []),
      api<Instructor[]>('/instructors?limit=3').catch(() => []),
    ]).then(([f, c, i]) => {
      if (!alive) return
      setFeatured(Array.isArray(f) ? f.slice(0, 4) : [])
      setCategories(Array.isArray(c) ? c.slice(0, 8) : [])
      setInstructors(Array.isArray(i) ? i.slice(0, 3) : [])
    })
    return () => {
      alive = false
    }
  }, [])

  const onSubmitSearch = () => {
    const q = searchTerm.trim()
    navigate(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')
  }

  return (
    <div className={cm.cn('bg-background text-on-surface antialiased')}>
      {/* Marketing TopNavBar */}
      <nav
        className={cm.cn(
          'bg-background/80 backdrop-blur-xl sticky top-0 w-full z-50 shadow-[0px_12px_32px_rgba(75,8,201,0.04)]',
        )}
      >
        <div className={cm.cn('flex justify-between items-center px-8 py-4 max-w-7xl mx-auto')}>
          <Link to="/" className={'text-2xl font-black tracking-tighter text-primary'}>
            {APP_NAME}
          </Link>
          <div className={cm.cn('hidden lg:flex items-center gap-2')}>
            {[
              { to: '/browse', label: t('landing.nav.browse', {}, { defaultValue: 'Browse' }) },
              {
                to: '/browse',
                label: t('landing.nav.categories', {}, { defaultValue: 'Categories' }),
              },
              {
                to: '/instructor',
                label: t('landing.nav.teach', {}, { defaultValue: 'Become an instructor' }),
              },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className={
                  'text-on-surface-variant font-medium hover:text-primary hover:bg-surface-container-low transition-all px-3 py-2 rounded-xl'
                }
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className={cm.cn('flex items-center gap-3')}>
            {isAuthenticated ? (
              <Link
                to="/my-learning"
                data-mol-id="nav-dashboard"
                className={
                  'bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-primary transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="nav-signin"
                  className={
                    'text-primary font-medium hover:text-primary-container transition-colors px-4 py-2'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup"
                  className={
                    'bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-primary transition-colors'
                  }
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={cm.cn('relative overflow-hidden')}>
        <div
          className={cm.cn(
            'absolute -top-40 -right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            'absolute top-1/3 -left-20 w-80 h-80 bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.sp('px', 8),
            cm.sp('py', 24),
            'max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[540px] relative z-10',
          )}
        >
          <div>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-widest text-primary mb-5',
              )}
            >
              {t(
                'landing.hero.eyebrow',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} · Editorial archive of mastery' },
              )}
            </p>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] text-on-surface mb-6',
              )}
            >
              {t('landing.hero.title.1', {}, { defaultValue: 'Master anything,' })}
              <br />
              <span
                className={cm.cn(
                  'bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent',
                )}
              >
                {t('landing.hero.title.2', {}, { defaultValue: 'teach everything.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                'text-lg lg:text-xl text-on-surface-variant max-w-lg leading-relaxed mb-10',
              )}
            >
              {t(
                'landing.hero.subtitle',
                {},
                {
                  defaultValue:
                    "Access the world's most curated archive of knowledge. Join a community of modern learners and industry-leading experts.",
                },
              )}
            </p>
            <div
              className={cm.cn(
                'flex items-center bg-surface-container-lowest p-2 rounded-2xl shadow-[0px_12px_32px_rgba(75,8,201,0.08)] max-w-xl h-16 mb-6',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-primary ml-4 mr-2')}
                aria-hidden="true"
              >
                search
              </span>
              <input
                data-mol-id="hero-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onSubmitSearch()
                  }
                }}
                className={cm.cn(
                  'w-full bg-transparent border-none focus:ring-0 text-base placeholder:text-outline outline-none',
                )}
                placeholder={t(
                  'landing.hero.searchPlaceholder',
                  {},
                  { defaultValue: 'What do you want to learn?' },
                )}
                type="text"
              />
              <button
                data-mol-id="hero-search-submit"
                onClick={onSubmitSearch}
                className={cm.cn(
                  'bg-primary-container text-on-primary h-full px-7 rounded-xl font-bold hover:bg-primary transition-colors',
                )}
              >
                {t('landing.hero.explore', {}, { defaultValue: 'Explore' })}
              </button>
            </div>
            <div className={cm.cn('flex flex-wrap gap-3 items-center')}>
              <span
                className={cm.cn(
                  'text-sm font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('landing.hero.trending', {}, { defaultValue: 'Trending' })}
              </span>
              {['Machine Learning', 'UI/UX Design', 'Creative Writing', 'Data Engineering'].map(
                (tag) => (
                  <Link
                    key={tag}
                    to={`/browse?q=${encodeURIComponent(tag)}`}
                    className={
                      'bg-surface-container-low text-on-surface px-4 py-1.5 rounded-full text-sm font-medium hover:bg-surface-container-high transition-colors'
                    }
                  >
                    {tag}
                  </Link>
                ),
              )}
            </div>
            <div className={cm.cn('mt-10 flex items-center gap-4')}>
              <div className={cm.cn('flex -space-x-3')}>
                {['a', 'b', 'c'].map((s) => (
                  <img
                    key={s}
                    src={`https://i.pravatar.cc/64?u=land-${s}`}
                    alt=""
                    className={cm.cn(
                      'w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover',
                    )}
                  />
                ))}
              </div>
              <p className={cm.cn('text-sm text-on-surface-variant font-medium')}>
                {t(
                  'landing.hero.proof',
                  {},
                  { defaultValue: 'Trusted by learners at Google, Meta, and Adobe.' },
                )}
              </p>
            </div>
          </div>
          {/* Sample card mirroring the auth'd hero */}
          <div className={cm.cn('relative')}>
            <div
              className={cm.cn(
                'absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary-fixed/40 rounded-[2rem] blur-3xl opacity-50',
              )}
            ></div>
            <div
              className={cm.cn(
                'relative bg-gradient-to-br from-primary to-primary-container rounded-[2rem] p-10 shadow-[0px_24px_60px_rgba(75,8,201,0.25)] text-white overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  'absolute -bottom-20 -right-20 w-72 h-72 bg-surface/10 rounded-full blur-3xl pointer-events-none',
                )}
              ></div>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-widest opacity-80 mb-3',
                )}
              >
                {t(
                  'landing.preview.eyebrow',
                  { appName: APP_NAME },
                  { defaultValue: 'Today on {{appName}}' },
                )}
              </p>
              <h2 className={cm.cn('text-3xl font-extrabold tracking-tight leading-tight mb-3')}>
                {t(
                  'landing.preview.title',
                  {},
                  { defaultValue: 'Mastering UI/UX Design: From Figma to Framer' },
                )}
              </h2>
              <p className={cm.cn('text-white/85 text-sm mb-6')}>
                {t(
                  'landing.preview.subtitle',
                  {},
                  { defaultValue: 'Sarah Dillard · 12 modules · 14h of editorial craft.' },
                )}
              </p>
              <div
                className={cm.cn(
                  'flex items-center gap-4 bg-surface/10 backdrop-blur-md rounded-xl px-5 py-4',
                )}
              >
                <div
                  className={cm.cn(
                    'w-12 h-12 bg-surface/15 rounded-full flex items-center justify-center',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl text-white')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    play_arrow
                  </span>
                </div>
                <div className={cm.cn('flex-1')}>
                  <p className={cm.cn('text-xs font-black uppercase tracking-widest opacity-80')}>
                    {t('landing.preview.lessonLabel', {}, { defaultValue: 'Lesson 03' })}
                  </p>
                  <p className={cm.cn('font-bold text-base leading-tight')}>
                    {t(
                      'landing.preview.lessonTitle',
                      {},
                      { defaultValue: 'Setting your studio palette' },
                    )}
                  </p>
                </div>
                <span
                  className={cm.cn('text-sm font-bold tabular-nums')}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  08:21
                </span>
              </div>
              <div className={cm.cn('mt-6 flex items-baseline justify-between')}>
                <div>
                  <p
                    className={cm.cn('text-[10px] font-black uppercase tracking-widest opacity-80')}
                  >
                    {t(
                      'landing.preview.includes',
                      { appName: APP_NAME },
                      { defaultValue: 'Includes a {{appName}} certificate' },
                    )}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    'bg-secondary-container text-on-secondary-container px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full',
                  )}
                >
                  {t('courseTile.badge.bestseller', {}, { defaultValue: 'Bestseller' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={cm.cn('bg-surface-container-low py-20')}>
        <div className={cm.cn('max-w-7xl mx-auto px-8')}>
          <h2
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-10 text-center',
            )}
          >
            {t('landing.categories.heading', {}, { defaultValue: 'Explore the archive' })}
          </h2>
          {categories.length === 0 ? (
            <p
              data-mol-id="categories-empty"
              className={cm.cn('text-center text-on-surface-variant text-sm')}
            >
              {t(
                'landing.categories.empty',
                {},
                { defaultValue: 'Categories will appear once the catalog is populated.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-6')}>
              {categories.map((c) => (
                <CategoryBubble
                  key={c.name}
                  label={c.name}
                  courseCount={c.courseCount ?? 0}
                  to={`/browse?category=${encodeURIComponent(c.name)}`}
                  emoji={pickCategoryEmoji(c.name)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Most popular */}
      <section className={cm.cn('bg-background py-24')}>
        <div className={cm.cn('max-w-7xl mx-auto px-8')}>
          <header className={cm.cn('flex items-end justify-between mb-12 gap-6 flex-wrap')}>
            <div>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
                )}
              >
                {t('landing.popular.eyebrow', {}, { defaultValue: 'Today on the desk' })}
              </p>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2',
                )}
              >
                {t('landing.popular.title', {}, { defaultValue: 'Most popular courses' })}
              </h2>
              <p className={cm.cn('text-on-surface-variant')}>
                {t(
                  'landing.popular.subtitle',
                  {},
                  { defaultValue: 'Curated knowledge from our highest-rated instructors.' },
                )}
              </p>
            </div>
            <Link
              to="/browse"
              className={
                'text-primary font-bold hover:text-primary-container transition-colors flex items-center gap-1'
              }
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </header>
          {featured.length === 0 ? (
            <p
              data-mol-id="featured-empty"
              className={cm.cn('text-center text-on-surface-variant text-sm py-12')}
            >
              {t(
                'landing.popular.empty',
                {},
                { defaultValue: 'New courses arrive regularly. Check back soon.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8')}>
              {featured.map((c) => (
                <CourseTile
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  instructor={c.instructor_name ?? `${APP_NAME} instructor`}
                  rating={c.rating_avg ?? 0}
                  reviewCount={c.rating_count ?? 0}
                  priceCents={c.price_cents > 0 ? c.price_cents : undefined}
                  originalPriceCents={c.original_price_cents ?? undefined}
                  imageSeed={c.slug ?? c.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Instructors */}
      <section className={cm.cn('bg-surface-container-low py-24')}>
        <div className={cm.cn('max-w-7xl mx-auto px-8')}>
          <header className={cm.cn('text-center mb-16 max-w-2xl mx-auto')}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
              )}
            >
              {t('landing.instructors.eyebrow', {}, { defaultValue: 'The faculty' })}
            </p>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-3',
              )}
            >
              {t('landing.instructors.title', {}, { defaultValue: 'Learn from the best' })}
            </h2>
            <p className={cm.cn('text-on-surface-variant text-lg')}>
              {t(
                'landing.instructors.subtitle',
                {},
                {
                  defaultValue:
                    'Our instructors are active professionals, leading archivists, and visionary creators.',
                },
              )}
            </p>
          </header>
          {instructors.length === 0 ? (
            <p
              data-mol-id="instructors-empty"
              className={cm.cn('text-center text-on-surface-variant text-sm py-12')}
            >
              {t(
                'landing.instructors.empty',
                {},
                { defaultValue: 'Instructor profiles will appear once the catalog has authors.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-8')}>
              {instructors.map((i) => (
                <InstructorAvatarCard
                  key={i.id}
                  id={i.id}
                  name={i.name}
                  role={i.bio?.split('.')[0] ?? `${APP_NAME} instructor`}
                  avatarSeed={i.id}
                  avgRating={i.average_rating ?? 0}
                  studentCount={i.total_students ?? 0}
                  courseCount={i.total_courses ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Become an instructor banner */}
      <section className={cm.cn('max-w-7xl mx-auto px-8 py-12')}>
        <div
          className={cm.cn(
            'bg-gradient-to-br from-primary to-primary-container rounded-[2rem] p-12 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12 shadow-[0px_24px_60px_rgba(75,8,201,0.25)]',
          )}
        >
          <div
            className={cm.cn(
              'absolute -right-20 -top-20 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none',
            )}
          ></div>
          <div className={cm.cn('relative z-10 max-w-xl')}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-widest text-white/80 mb-3',
              )}
            >
              {t('landing.teachCta.eyebrow', {}, { defaultValue: 'Become an instructor' })}
            </p>
            <h2
              className={cm.cn(
                'text-4xl lg:text-5xl font-extrabold text-white tracking-tighter leading-[1.05] mb-6',
              )}
            >
              {t(
                'landing.teachCta.title',
                {},
                { defaultValue: 'Share your knowledge with the world.' },
              )}
            </h2>
            <p className={cm.cn('text-white/85 text-lg mb-8')}>
              {t(
                'landing.teachCta.subtitle',
                {},
                {
                  defaultValue:
                    'Join our faculty of modern archivists. Teach millions of students globally and build a legacy of enlightenment.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="cta-teach"
              className={
                'inline-flex items-center gap-2 bg-surface text-primary px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform'
              }
            >
              {t('landing.teachCta.button', {}, { defaultValue: 'Start teaching today' })}
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn('relative z-10 hidden lg:block')}>
            <div
              className={cm.cn(
                'w-72 h-72 rounded-full bg-surface/10 backdrop-blur-md flex items-center justify-center',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white text-[120px] opacity-90')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                workspace_premium
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing

/**
 * Gradient hero banner — purple gradient with frosted-glass orbs,
 * a centered headline, optional eyebrow + CTA. Used on Landing,
 * MyLearning header, InstructorDashboard welcome.
 *
 * Translated from lms's WelcomeBanner.tsx into Lectura's purple/gold
 * palette per DESIGN.md.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export type CourseHeroBannerProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaTo?: string
  ctaOnClick?: () => void
  ctaDisabled?: boolean
  icon?: string
}

export function CourseHeroBanner(props: CourseHeroBannerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white shadow-[0px_12px_32px_rgba(75,8,201,0.2)]',
      )}
      data-mol-id="course-hero-banner"
    >
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-80 h-80 bg-surface/10 rounded-full blur-3xl pointer-events-none',
        )}
      ></div>
      <div
        className={cm.cn(
          'absolute -top-40 -left-40 w-96 h-96 bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none mix-blend-overlay',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', gap: 8 }),
          'relative z-10 flex-wrap',
        )}
      >
        <div className={cm.maxW('xl')}>
          {props.eyebrow && (
            <p
              className={cm.cn('text-[11px] font-black uppercase tracking-widest opacity-80 mb-3')}
            >
              {props.eyebrow}
            </p>
          )}
          <h1
            className={cm.cn(
              cm.sp('mb', 4),
              'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.95]',
            )}
          >
            {props.title}
          </h1>
          {props.subtitle && (
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 8),
                'opacity-90 leading-relaxed max-w-lg',
              )}
            >
              {props.subtitle}
            </p>
          )}
          {props.ctaLabel && props.ctaOnClick && (
            <button
              type="button"
              onClick={props.ctaOnClick}
              disabled={props.ctaDisabled}
              data-mol-id="course-hero-cta"
              className={
                'inline-flex items-center gap-2 bg-surface text-primary px-7 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60'
              }
            >
              {props.ctaLabel}
              <span className={cm.cn('material-symbols-outlined text-[1.1rem]')}>
                arrow_forward
              </span>
            </button>
          )}
          {props.ctaLabel && !props.ctaOnClick && props.ctaTo && (
            <Link
              to={props.ctaTo}
              data-mol-id="course-hero-cta"
              className={
                'inline-flex items-center gap-2 bg-surface text-primary px-7 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform'
              }
            >
              {props.ctaLabel}
              <span className={cm.cn('material-symbols-outlined text-[1.1rem]')}>
                arrow_forward
              </span>
            </Link>
          )}
        </div>
        {props.icon && (
          <div className={cm.cn('hidden lg:block relative')}>
            <div
              className={cm.cn(
                'w-32 h-32 rounded-full bg-surface/15 backdrop-blur-md flex items-center justify-center',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[64px] text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {props.icon}
              </span>
            </div>
            <span
              className={cm.cn(
                'absolute -bottom-2 -right-2 bg-secondary-container text-on-secondary-container px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg',
              )}
            >
              {t(
                'courseHeroBanner.lectura',
                { appName: APP_NAME },
                { defaultValue: '{{appName}}' },
              )}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

export default CourseHeroBanner

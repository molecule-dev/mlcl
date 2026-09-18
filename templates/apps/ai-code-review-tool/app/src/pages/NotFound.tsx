// Refract 404 — terminal-style derivative of the Refract auth card.
// Pattern source: api-documentation NotFound (dark dev-tools panel).
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, BRAND_COLOR } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const submitGradient = `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})`

const gridBackground = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'relative font-body overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--color-auth-dark)', color: 'var(--color-auth-text)' }}
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={gridBackground} />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
        )}
        style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.16 }}
      />

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xl' }),
              cm.sp('p', 10),
              cm.textCenter,
              'rounded-xl',
            )}
            style={{
              backgroundColor: 'var(--color-auth-panel)',
              border: '1px solid var(--color-auth-border)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            <AuthBrandHeader
              subtitle={t('notFound.subtitle', {}, { defaultValue: '// status: 404' })}
            />

            <div
              className="font-mono font-extrabold tracking-tight leading-none select-none"
              style={{
                fontSize: '7rem',
                color: BRAND_COLOR,
                textShadow: `0 0 40px ${BRAND_COLOR}55`,
              }}
              aria-hidden="true"
            >
              404
            </div>

            <div className={cm.stack(2)}>
              <h2
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                style={{ color: 'var(--color-auth-text)' }}
              >
                {t('notFound.heading', {}, { defaultValue: 'Page not found' })}
              </h2>
              <p
                className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}
                style={{ color: 'var(--color-auth-muted)' }}
              >
                {t(
                  'notFound.body',
                  {},
                  { defaultValue: 'The path you requested does not exist or has been moved.' },
                )}
              </p>
            </div>

            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white hover:shadow-lg active:scale-95 transition-all',
                )}
                style={{ background: submitGradient }}
              >
                {t('notFound.backToDashboard', {}, { defaultValue: 'Back to Dashboard' })}
              </button>
              <Link
                to="/search"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'rounded-lg transition-all hover:opacity-80',
                )}
                style={{
                  border: '1px solid var(--color-auth-border)',
                  color: 'var(--color-auth-text)',
                }}
              >
                {t(
                  'notFound.searchRefract',
                  { appName: APP_NAME },
                  { defaultValue: 'Search {{appName}}' },
                )}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound
export { NotFound as NotFoundPage }

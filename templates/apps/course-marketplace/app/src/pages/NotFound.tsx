import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 6 }),
          cm.sp('p', 12),
          'flex-1 text-center',
        )}
      >
        <div className={cm.cn('relative')}>
          <span
            className={cm.cn(
              'text-[10rem] font-extrabold tracking-tighter leading-none bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent',
            )}
            aria-hidden="true"
          >
            404
          </span>
          <div
            className={cm.cn(
              'absolute -top-8 -right-8 w-32 h-32 bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none',
            )}
          ></div>
        </div>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('notFound.title', {}, { defaultValue: 'Lesson not found' })}
        </h1>
        <p className={cm.cn('text-on-surface-variant max-w-md leading-relaxed')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "The page you're looking for has been moved or doesn't exist. Browse the archive to find your next course.",
            },
          )}
        </p>
        <div className={cm.cn('flex gap-4')}>
          <Link
            to="/"
            data-mol-id="notfound-home"
            className={
              'px-7 py-3 rounded-xl bg-primary-container text-on-primary font-bold shadow-md hover:bg-primary transition-colors'
            }
          >
            {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
          </Link>
          <Link
            to="/browse"
            data-mol-id="notfound-browse"
            className={
              'px-7 py-3 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container-high transition-colors'
            }
          >
            {t('notFound.browseCourses', {}, { defaultValue: 'Browse courses' })}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NotFound

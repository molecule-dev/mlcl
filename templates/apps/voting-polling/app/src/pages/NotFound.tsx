import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        'min-h-screen relative overflow-hidden bg-background text-on-surface antialiased',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary-fixed/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          cm.sp('px', 6),
          'relative flex min-h-screen flex-col items-center justify-center text-center',
        )}
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
          {t('notFound.eyebrow', {}, { defaultValue: 'No quorum on this route' })}
        </span>
        <p
          className={cm.cn(
            'mt-3 font-mono text-[10rem] leading-none font-extrabold tracking-tighter text-primary/15',
          )}
        >
          404
        </p>
        <h1
          className={cm.cn(
            '-mt-8',
            'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('notFound.heading', {}, { defaultValue: 'This ballot is empty.' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 4), cm.maxW('xl'), 'text-on-surface-variant font-medium')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'The page you tried to reach has been closed or moved. Head back to the dashboard or open a fresh poll.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.sp('mt', 8), cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}
        >
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
            )}
          >
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/polls/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('notFound.newPoll', {}, { defaultValue: 'Open a new poll →' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

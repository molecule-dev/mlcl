import { Link, useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const ACTIVE_CLS =
  'flex items-center gap-3 text-on-surface border-l-4 border-primary bg-primary/10 py-3 px-4 rounded-r-lg group hover:bg-primary/15 transition-colors duration-200'
const INACTIVE_CLS =
  'flex items-center gap-3 text-on-surface-variant py-3 px-4 hover:bg-surface/5 hover:text-on-surface transition-all duration-200 rounded-r-lg group'

export default function ModelLibrarySideNav() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  // The active category comes from the URL (?category=…) so it stays in sync
  // with the grid filter and survives reloads — never from throwaway local state.
  const [searchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') ?? ''

  const categories = [
    {
      slug: 'architecture',
      icon: 'domain',
      label: t('nav.architecture', {}, { defaultValue: 'Architecture' }),
    },
    {
      slug: 'characters',
      icon: 'person_4',
      label: t('nav.characters', {}, { defaultValue: 'Characters' }),
    },
    {
      slug: 'vehicles',
      icon: 'directions_car',
      label: t('nav.vehicles', {}, { defaultValue: 'Vehicles' }),
    },
    { slug: 'props', icon: 'category', label: t('nav.props', {}, { defaultValue: 'Props' }) },
  ]

  return (
    <nav
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        "fixed left-0 top-0 h-screen w-64 z-40 bg-surface-container-lowest font-['Inter'] border-none hidden md:flex",
      )}
    >
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 12))}>
        <Link to="/dashboard" className="block">
          <div
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tighter',
            )}
          >
            {t('nav.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </div>
          <div className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-foreground-tertiary')}>
            {t('nav.appSubtitle', {}, { defaultValue: '3D Design Studio' })}
            <span className={cm.sp('ml', 2)}>
              {t('nav.version', {}, { defaultValue: 'V0.1.4-BETA' })}
            </span>
          </div>
        </Link>
      </div>
      <div className={cm.cn(cm.flex1, cm.sp('px', 2), cm.stack(2))}>
        <Link className={activeCategory === '' ? ACTIVE_CLS : INACTIVE_CLS} to="/models">
          <span
            className={cm.cn(
              'material-symbols-outlined text-on-primary-container group-hover:text-on-surface transition-colors duration-200',
            )}
          >
            view_in_ar
          </span>
          <span>{t('nav.allModels', {}, { defaultValue: 'All Models' })}</span>
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            className={activeCategory === category.slug ? ACTIVE_CLS : INACTIVE_CLS}
            to={`/models?category=${category.slug}`}
          >
            <span
              className={cm.cn(
                'material-symbols-outlined group-hover:text-on-surface transition-colors duration-200',
              )}
            >
              {category.icon}
            </span>
            <span>{category.label}</span>
          </Link>
        ))}
      </div>
      <div className={cm.cn(cm.sp('px', 6), cm.stack(4), 'mt-auto')}>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            'btn-gradient text-on-primary rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_14px_0_rgba(99,14,212,0.39)]',
          )}
          onClick={() => navigate('/upload')}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>add</span>
          {t('header.uploadModel', {}, { defaultValue: 'Upload Model' })}
        </button>
        <div className={cm.cn(cm.sp('pt', 4), cm.stack(2), 'border-t border-surface/10')}></div>
      </div>
    </nav>
  )
}
export { ModelLibrarySideNav }

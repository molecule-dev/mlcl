import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { SettingsPanel } from '../components/SettingsPanel.js'

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-5xl mx-auto w-full flex-1')}>
        <div className={cm.cn('mb-10')}>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
            )}
          >
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </p>
          <h1
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
        </div>
        <div className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm')}>
          <SettingsPanel onClose={() => navigate('/my-learning')} />
        </div>
        <section
          className={cm.cn(cm.sp('p', 8), cm.sp('mt', 8), 'bg-surface-container-low rounded-xl')}
        >
          <div className={cm.sp('mb', 6)}>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
          <ThemeToggle />
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Settings

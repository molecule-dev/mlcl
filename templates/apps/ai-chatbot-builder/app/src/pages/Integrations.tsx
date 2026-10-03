// Phase 1 baseline — verbatim JSX of design-ai-chatbot-builder-integrations.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'
import IntegrationsAnalyticsSection from '../components/IntegrationsAnalyticsSection.js'
import IntegrationsCategoryFilters from '../components/IntegrationsCategoryFilters.js'
import IntegrationsCRMSection from '../components/IntegrationsCrmSection.js'
import IntegrationsCustomSection from '../components/IntegrationsCustomSection.js'
import IntegrationsMessagingSection from '../components/IntegrationsMessagingSection.js'
import IntegrationsPageHeader from '../components/IntegrationsPageHeader.js'
import UserMenu from '../components/UserMenu.js'

type Category = 'all' | 'messaging' | 'crm' | 'analytics' | 'developer'

function Integrations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  // The former IntegrationsTopBar, folded into the shared shell's top bar:
  // docs/support/API links + the Deploy Bot CTA beside the user menu.
  const shellActions = (
    <>
      <div
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'hidden lg:flex items-center gap-6',
        )}
      >
        <Link
          className={cm.cn('text-foreground-secondary hover:text-primary transition-colors')}
          to="/help"
        >
          {t('integrationsTopBar.documentation', {}, { defaultValue: 'Documentation' })}
        </Link>
        <Link
          className={cm.cn('text-foreground-secondary hover:text-primary transition-colors')}
          to="/settings"
        >
          {t('integrationsTopBar.support', {}, { defaultValue: 'Support' })}
        </Link>
        <Link
          className={cm.cn('text-foreground-secondary hover:text-primary transition-colors')}
          to="/help#api"
        >
          {t('integrationsTopBar.api', {}, { defaultValue: 'API' })}
        </Link>
      </div>
      <div className={cm.cn('w-px h-6 bg-outline-variant/30')}></div>
      <Link
        className={cm.cn(
          'ai-gradient-bg text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all',
        )}
        to="/bots"
      >
        {t('integrationsTopBar.deployBot', {}, { defaultValue: 'Deploy Bot' })}
      </Link>
      <UserMenu />
    </>
  )

  return (
    <AppShell
      className="bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed"
      leading={
        <h1
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-on-surface font-headline',
          )}
        >
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h1>
      }
      actions={shellActions}
    >
      {/* Main Content Canvas */}
      <main className={cm.cn(cm.sp('p', 4), 'md:p-8')}>
        <div className={cm.stack(8)}>
          {/* Header & Search Section */}
          <IntegrationsPageHeader search={search} onSearchChange={setSearch} />
          {/* Category Filters */}
          <IntegrationsCategoryFilters
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          {/* Messaging Section */}
          {(activeCategory === 'all' || activeCategory === 'messaging') && (
            <IntegrationsMessagingSection />
          )}
          {/* CRM Section */}
          {(activeCategory === 'all' || activeCategory === 'crm') && <IntegrationsCRMSection />}
          {/* Analytics Section */}
          {(activeCategory === 'all' || activeCategory === 'analytics') && (
            <IntegrationsAnalyticsSection />
          )}
          {/* Custom / Dev Tools Section */}
          {(activeCategory === 'all' || activeCategory === 'developer') && (
            <IntegrationsCustomSection />
          )}
        </div>
      </main>
      {/* Contextual "Help" Floating Action suppressed as per shell rules for focus */}
      {/* Decorative Ambient Glow */}
      <div
        className={cm.cn(
          cm.roundedFull,
          'fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none',
        )}
      ></div>
      <div
        className={cm.cn(
          'w-[400px]',
          'h-[400px]',
          cm.roundedFull,
          'fixed bottom-0 left-64 -z-10 bg-tertiary/5 blur-[100px] pointer-events-none',
        )}
      ></div>
    </AppShell>
  )
}

export default Integrations
export { Integrations, Integrations as IntegrationsPage }

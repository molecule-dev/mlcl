// Phase 1 baseline — verbatim JSX of design-ai-chatbot-builder-integrations.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import IntegrationsAnalyticsSection from '../components/IntegrationsAnalyticsSection.js'
import IntegrationsCategoryFilters from '../components/IntegrationsCategoryFilters.js'
import IntegrationsCRMSection from '../components/IntegrationsCrmSection.js'
import IntegrationsCustomSection from '../components/IntegrationsCustomSection.js'
import IntegrationsMessagingSection from '../components/IntegrationsMessagingSection.js'
import IntegrationsPageHeader from '../components/IntegrationsPageHeader.js'
import IntegrationsSideNavBar from '../components/IntegrationsSideNavBar.js'
import IntegrationsTopBar from '../components/IntegrationsTopBar.js'
type Category = 'all' | 'messaging' | 'crm' | 'analytics' | 'developer'
function Integrations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  return (
    <div
      className={cm.cn(
        'bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
      aria-label={t('integrations.pageLabel', {}, { defaultValue: 'Channel integrations' })}
    >
      {/* SideNavBar Shell */}
      <IntegrationsSideNavBar />
      <IntegrationsTopBar />
      {/* Main Content Canvas */}
      <main className={cm.cn(cm.sp('p', 4), cm.minH('screen'), 'ml-0 md:ml-64 md:p-8')}>
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
    </div>
  )
}

export default Integrations
export { Integrations, Integrations as IntegrationsPage }

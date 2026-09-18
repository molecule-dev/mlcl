// Phase 1 baseline — verbatim JSX of design-3d-model-viewer-landing.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import FeaturesSection from '../components/FeaturesSection.js'
import HeroCopy from '../components/HeroCopy.js'
import HeroViewport from '../components/HeroViewport.js'
import LandingFooter from '../components/LandingFooter.js'
import TopNavBar from '../components/TopNavBar.js'
function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Public landing page — no authenticated /api calls. The "10,000 creators"
  // social-proof line is brand copy, not a live count, and an unauthenticated
  // GET /api/models would 401 noisily on first paint.
  const modelCount = null
  return (
    <div
      className="bg-surface text-on-surface font-body antialiased selection:bg-primary-fixed selection:text-primary-fixed-dim"
      aria-label={t('landing.title', {}, { defaultValue: 'Showcase your 3D models' })}
    >
      {/* TopNavBar */}
      <TopNavBar />
      <main className={cm.cn('pt-24 md:pt-32 pb-24')}>
        {/* Hero Section */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ direction: 'col', align: 'center', gap: 16 }),
            'md:px-8 lg:flex-row mb-32',
          )}
        >
          <HeroCopy modelCount={modelCount} />
          <HeroViewport />
        </section>
        {/* Features Grid */}
        <FeaturesSection />
      </main>
      {/* Footer */}
      <LandingFooter />
    </div>
  )
}

export default Landing
export { Landing, Landing as LandingPage }

// Phase 1 baseline — verbatim JSX of design-blog-landing.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'

import FeaturedPostsSection from '../components/FeaturedPostsSection.js'
import HeroSection from '../components/HeroSection.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'
import TopicsRow from '../components/TopicsRow.js'
import TrendingSection from '../components/TrendingSection.js'
function Landing() {
  const { t } = useTranslation()
  const pageTitle = t('landing.pageTitle', {}, { defaultValue: 'Welcome' })
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])
  return (
    <>
      {/* TopAppBar */}
      <LandingTopNavBar />
      <main aria-label={pageTitle}>
        {/* Hero Section */}
        <HeroSection />
        {/* Trending Section */}
        <TrendingSection />
        <TopicsRow />
        <FeaturedPostsSection />
      </main>
      <LandingFooter />
    </>
  )
}

export default Landing
export { Landing, Landing as LandingPage }

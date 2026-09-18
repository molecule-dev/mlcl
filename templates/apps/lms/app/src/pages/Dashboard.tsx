// Phase 1 baseline — verbatim JSX of design-lms-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AiRecommendationCard from '../components/AiRecommendationCard.js'
import AverageScoreCard from '../components/AverageScoreCard.js'
import CompletedLessonsCard from '../components/CompletedLessonsCard.js'
import ContinueLearningSection from '../components/ContinueLearningSection.js'
import KpiCard from '../components/KpiCard.js'
import LeaderboardCard from '../components/LeaderboardCard.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'
import UpcomingDeadlinesSection from '../components/UpcomingDeadlinesSection.js'
import WelcomeBanner from '../components/WelcomeBanner.js'
function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}>
      {/* SideNavBar */}
      <SideNavBar />
      {/* TopNavBar */}
      <TopNavBar />
      {/* Main Content */}
      <main
        className={cm.cn(cm.sp('px', 8), cm.sp('pb', 12), cm.stack(10), 'ml-[260px] pt-24')}
        aria-label={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      >
        {/* Welcome Banner */}
        <WelcomeBanner />
        {/* Staggered Layout for Stats and Content */}
        <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
          <div className={cm.cn(cm.stack(10), 'col-span-12 lg:col-span-8')}>
            {/* KPI Cards */}
            <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
              <KpiCard />
              <CompletedLessonsCard />
              <AverageScoreCard />
            </section>
            {/* Continue Learning Horizontal Scroll */}
            <ContinueLearningSection />
            {/* Learning Pulse (Upcoming Deadlines) */}
            <UpcomingDeadlinesSection />
          </div>
          {/* Sidebar: Leaderboard and AI */}
          <div className={cm.cn(cm.stack(10), 'col-span-12 lg:col-span-4')}>
            <LeaderboardCard />
            {/* AI Recommendations (Tertiary/Purple Accent) */}
            <AiRecommendationCard />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }

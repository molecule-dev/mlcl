import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NewsAggregatorLayout } from './components/NewsAggregatorLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Saved } from './pages/Saved.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SourceDetail } from './pages/SourceDetail.js'
import { Sources } from './pages/Sources.js'
import { StoryDetail } from './pages/StoryDetail.js'
import { Terms } from './pages/Terms.js'
import { TopicDetail } from './pages/TopicDetail.js'
import { Topics } from './pages/Topics.js'

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
          <AnalyticsRouteListener />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AuthGuard />}>
              <Route element={<NewsAggregatorLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/topics" element={<Topics />} />
                <Route path="/topics/:slug" element={<TopicDetail />} />
                <Route path="/stories/:id" element={<StoryDetail />} />
                <Route path="/sources" element={<Sources />} />
                <Route path="/sources/:slug" element={<SourceDetail />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/search" element={<Search />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}

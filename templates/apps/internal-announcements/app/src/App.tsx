import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { InternalAnnouncementsLayout } from './components/InternalAnnouncementsLayout.js'
import { About } from './pages/About.js'
import { Analytics } from './pages/Analytics.js'
import { AnnouncementDetail } from './pages/AnnouncementDetail.js'
import { Composer } from './pages/Composer.js'
import { Feed } from './pages/Feed.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyAcknowledgments } from './pages/MyAcknowledgments.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TeamDirectory } from './pages/TeamDirectory.js'
import { Terms } from './pages/Terms.js'

export function App() {
  return (
    <BrowserRouter useTransitions={false}>
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/*
            /pricing is the public marketing surface — the landing page
            links here for unauthenticated visitors comparing plans, AND
            authenticated users use it to upgrade. It must NOT live
            inside <AuthGuard /> or the landing CTA bounces visitors
            straight into /login (a real UX regression caught during
            the production-ready walk-through).
          */}
          <Route element={<AppLayout />}>
            <Route path="/pricing" element={<Pricing />} />
          </Route>
          <Route element={<AuthGuard />}>
            <Route element={<InternalAnnouncementsLayout />}>
              <Route path="/feed" element={<Feed />} />
              <Route path="/announcement/:id" element={<AnnouncementDetail />} />
              <Route path="/compose" element={<Composer />} />
              <Route path="/my-acknowledgments" element={<MyAcknowledgments />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/search" element={<Search />} />
              <Route path="/people" element={<TeamDirectory />} />
            </Route>
            <Route element={<AppLayout />}>
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

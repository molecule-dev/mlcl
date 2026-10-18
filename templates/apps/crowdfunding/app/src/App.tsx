import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CreatorSidebarLayout } from './components/CreatorSidebarLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Backers = lazy(() => import('./pages/Backers.js').then((m) => ({ default: m.Backers })))
const CampaignDetail = lazy(() =>
  import('./pages/CampaignDetail.js').then((m) => ({ default: m.CampaignDetail })),
)
const CampaignEditor = lazy(() =>
  import('./pages/CampaignEditor.js').then((m) => ({ default: m.CampaignEditor })),
)
const CampaignManage = lazy(() =>
  import('./pages/CampaignManage.js').then((m) => ({ default: m.CampaignManage })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Discover = lazy(() => import('./pages/Discover.js').then((m) => ({ default: m.Discover })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyPledges = lazy(() => import('./pages/MyPledges.js').then((m) => ({ default: m.MyPledges })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PledgeCheckout = lazy(() =>
  import('./pages/PledgeCheckout.js').then((m) => ({ default: m.PledgeCheckout })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<CreatorSidebarLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/campaign/new" element={<CampaignEditor />} />
                  <Route path="/campaign/:id" element={<CampaignDetail />} />
                  <Route path="/campaign/:id/pledge" element={<PledgeCheckout />} />
                  <Route path="/campaign/:id/manage" element={<CampaignManage />} />
                  <Route path="/backers" element={<Backers />} />
                  <Route path="/my-pledges" element={<MyPledges />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

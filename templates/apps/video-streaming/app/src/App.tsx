import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SpoolLayout } from './components/SpoolLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Channel = lazy(() => import('./pages/Channel.js').then((m) => ({ default: m.Channel })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Library = lazy(() => import('./pages/Library.js').then((m) => ({ default: m.Library })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PlaylistDetail = lazy(() =>
  import('./pages/PlaylistDetail.js').then((m) => ({ default: m.PlaylistDetail })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Studio = lazy(() => import('./pages/Studio.js').then((m) => ({ default: m.Studio })))
const Subscriptions = lazy(() =>
  import('./pages/Subscriptions.js').then((m) => ({ default: m.Subscriptions })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Trending = lazy(() => import('./pages/Trending.js').then((m) => ({ default: m.Trending })))
const Upload = lazy(() => import('./pages/Upload.js').then((m) => ({ default: m.Upload })))
const Watch = lazy(() => import('./pages/Watch.js').then((m) => ({ default: m.Watch })))
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
                <Route element={<SpoolLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/watch/:id" element={<Watch />} />
                  <Route path="/channel/:id" element={<Channel />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/trending" element={<Trending />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/playlist/:id" element={<PlaylistDetail />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

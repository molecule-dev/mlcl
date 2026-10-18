import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NewsAggregatorLayout } from './components/NewsAggregatorLayout.js'
import { NotFound } from './components/NotFound.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Saved = lazy(() => import('./pages/Saved.js').then((m) => ({ default: m.Saved })))
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SourceDetail = lazy(() =>
  import('./pages/SourceDetail.js').then((m) => ({ default: m.SourceDetail })),
)
const Sources = lazy(() => import('./pages/Sources.js').then((m) => ({ default: m.Sources })))
const StoryDetail = lazy(() =>
  import('./pages/StoryDetail.js').then((m) => ({ default: m.StoryDetail })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TopicDetail = lazy(() =>
  import('./pages/TopicDetail.js').then((m) => ({ default: m.TopicDetail })),
)
const Topics = lazy(() => import('./pages/Topics.js').then((m) => ({ default: m.Topics })))

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter useTransitions={false}>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
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
              <Route path="*" element={<NotFound />} />
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
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}

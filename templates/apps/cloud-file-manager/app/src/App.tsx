import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const FileDetail = lazy(() =>
  import('./pages/FileDetail.js').then((m) => ({ default: m.FileDetail })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyFiles = lazy(() => import('./pages/MyFiles.js').then((m) => ({ default: m.MyFiles })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Recent = lazy(() => import('./pages/Recent.js').then((m) => ({ default: m.Recent })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SearchResults = lazy(() =>
  import('./pages/SearchResults.js').then((m) => ({ default: m.SearchResults })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const SharedWithMe = lazy(() =>
  import('./pages/SharedWithMe.js').then((m) => ({ default: m.SharedWithMe })),
)
const SharePublic = lazy(() =>
  import('./pages/SharePublic.js').then((m) => ({ default: m.SharePublic })),
)
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Starred = lazy(() => import('./pages/Starred.js').then((m) => ({ default: m.Starred })))
const Storage = lazy(() => import('./pages/Storage.js').then((m) => ({ default: m.Storage })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Trash = lazy(() => import('./pages/Trash.js').then((m) => ({ default: m.Trash })))
const Upload = lazy(() => import('./pages/Upload.js').then((m) => ({ default: m.Upload })))
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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/s/:token" element={<SharePublic />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route element={<AuthGuard />}>
                <Route path="/files" element={<MyFiles />} />
                <Route path="/files/:id" element={<FileDetail />} />
                <Route path="/shared" element={<SharedWithMe />} />
                <Route path="/starred" element={<Starred />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/recent" element={<Recent />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/storage" element={<Storage />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}

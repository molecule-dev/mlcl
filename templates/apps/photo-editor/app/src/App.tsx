import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlbumDetail = lazy(() =>
  import('./pages/AlbumDetail.js').then((m) => ({ default: m.AlbumDetail })),
)
const Editor = lazy(() => import('./pages/Editor.js').then((m) => ({ default: m.Editor })))
const Export = lazy(() => import('./pages/Export.js').then((m) => ({ default: m.Export })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Library = lazy(() => import('./pages/Library.js').then((m) => ({ default: m.Library })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Presets = lazy(() => import('./pages/Presets.js').then((m) => ({ default: m.Presets })))
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
        <AnalyticsRouteListener />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route element={<AuthGuard />}>
              <Route path="/library" element={<Library />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/export" element={<Export />} />
              <Route path="/presets" element={<Presets />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/album/:id" element={<AlbumDetail />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              {/* The shared PlanUpdated page links its "View receipt" action to
                  /billing — this app manages the plan from Settings, so redirect. */}
              <Route path="/billing" element={<Navigate to="/settings" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

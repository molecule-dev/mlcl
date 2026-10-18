import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PhotoSharingLayout } from './components/PhotoSharingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlbumDetail = lazy(() =>
  import('./pages/AlbumDetail.js').then((m) => ({ default: m.AlbumDetail })),
)
const Albums = lazy(() => import('./pages/Albums.js').then((m) => ({ default: m.Albums })))
const Explore = lazy(() => import('./pages/Explore.js').then((m) => ({ default: m.Explore })))
const Favorites = lazy(() => import('./pages/Favorites.js').then((m) => ({ default: m.Favorites })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Galleries = lazy(() => import('./pages/Galleries.js').then((m) => ({ default: m.Galleries })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyPhotos = lazy(() => import('./pages/MyPhotos.js').then((m) => ({ default: m.MyPhotos })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PhotoDetail = lazy(() =>
  import('./pages/PhotoDetail.js').then((m) => ({ default: m.PhotoDetail })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
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
const Upload = lazy(() => import('./pages/Upload.js').then((m) => ({ default: m.Upload })))

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
                <Route element={<PhotoSharingLayout />}>
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/photos/:id" element={<PhotoDetail />} />
                  <Route path="/albums" element={<Albums />} />
                  <Route path="/albums/:id" element={<AlbumDetail />} />
                  <Route path="/my-photos" element={<MyPhotos />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/galleries" element={<Galleries />} />
                  <Route path="/u/:handle" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
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

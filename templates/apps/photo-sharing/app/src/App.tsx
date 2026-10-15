import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PhotoSharingLayout } from './components/PhotoSharingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { AlbumDetail } from './pages/AlbumDetail.js'
import { Albums } from './pages/Albums.js'
import { Explore } from './pages/Explore.js'
import { Favorites } from './pages/Favorites.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Galleries } from './pages/Galleries.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyPhotos } from './pages/MyPhotos.js'
import { NotFound } from './pages/NotFound.js'
import { PhotoDetail } from './pages/PhotoDetail.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Upload } from './pages/Upload.js'

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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

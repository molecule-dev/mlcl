import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { FileDetail } from './pages/FileDetail.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyFiles } from './pages/MyFiles.js'
import { NotFound } from './pages/NotFound.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Recent } from './pages/Recent.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SearchResults } from './pages/SearchResults.js'
import { Settings } from './pages/Settings.js'
import { SharedWithMe } from './pages/SharedWithMe.js'
import { SharePublic } from './pages/SharePublic.js'
import { Signup } from './pages/Signup.js'
import { Starred } from './pages/Starred.js'
import { Storage } from './pages/Storage.js'
import { Terms } from './pages/Terms.js'
import { Trash } from './pages/Trash.js'
import { Upload } from './pages/Upload.js'
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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}

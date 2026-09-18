import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MindMappingLayout } from './components/MindMappingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Billing } from './pages/Billing.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MapEditor } from './pages/MapEditor.js'
import { Maps } from './pages/Maps.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { PublicMap } from './pages/PublicMap.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Share } from './pages/Share.js'
import { Signup } from './pages/Signup.js'
import { TemplateDetail } from './pages/TemplateDetail.js'
import { Templates } from './pages/Templates.js'
import { Terms } from './pages/Terms.js'
import { Trash } from './pages/Trash.js'
import { VersionHistory } from './pages/VersionHistory.js'

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
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
            <Route path="/public/:slug" element={<PublicMap />} />

            <Route element={<AuthGuard />}>
              <Route element={<MindMappingLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/maps" element={<Maps />} />
                <Route path="/maps/:id" element={<MapEditor />} />
                <Route path="/maps/:id/share" element={<Share />} />
                <Route path="/maps/:id/history" element={<VersionHistory />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/templates/:id" element={<TemplateDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/account" element={<Settings />} />
                <Route path="/settings/password" element={<Settings />} />
                <Route path="/settings/language" element={<Settings />} />
                <Route path="/settings/billing" element={<Billing />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PasswordManagerLayout } from './components/PasswordManagerLayout.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Generator } from './pages/Generator.js'
import { ItemDetail } from './pages/ItemDetail.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewItem } from './pages/NewItem.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SecurityReport } from './pages/SecurityReport.js'
import { Settings } from './pages/Settings.js'
import { SharedVaultDetail } from './pages/SharedVaultDetail.js'
import { SharedVaults } from './pages/SharedVaults.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Trash } from './pages/Trash.js'
import { Vault } from './pages/Vault.js'

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
            <Route element={<PasswordManagerLayout />}>
              <Route path="/vault" element={<Vault />} />
              <Route path="/vault/new" element={<NewItem />} />
              <Route path="/vault/:id" element={<ItemDetail />} />
              <Route path="/generator" element={<Generator />} />
              <Route path="/shared" element={<SharedVaults />} />
              <Route path="/shared/:id" element={<SharedVaultDetail />} />
              <Route path="/security" element={<SecurityReport />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

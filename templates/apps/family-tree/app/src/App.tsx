import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { BranchesLayout } from './components/BranchesLayout.js'
import { About } from './pages/About.js'
import { AddPerson } from './pages/AddPerson.js'
import { AddRelative } from './pages/AddRelative.js'
import { EditPerson } from './pages/EditPerson.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { People } from './pages/People.js'
import { PersonDetail } from './pages/PersonDetail.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Tree } from './pages/Tree.js'
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
          {/* Public marketing + auth */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Authenticated app shell — sidebar nav + outlet */}
          <Route element={<AuthGuard />}>
            <Route element={<BranchesLayout />}>
              <Route path="/tree" element={<Tree />} />
              <Route path="/people" element={<People />} />
              <Route path="/people/new" element={<AddPerson />} />
              <Route path="/people/:id" element={<PersonDetail />} />
              <Route path="/people/:id/edit" element={<EditPerson />} />
              <Route path="/people/:id/add-relative" element={<AddRelative />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

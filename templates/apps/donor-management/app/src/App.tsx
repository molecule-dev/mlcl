import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DonorLayout } from './components/DonorLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Campaigns } from './pages/Campaigns.js'
import { Dashboard } from './pages/Dashboard.js'
import { DonorDetail } from './pages/DonorDetail.js'
import { Donors } from './pages/Donors.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GiftDetail } from './pages/GiftDetail.js'
import { Gifts } from './pages/Gifts.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewDonor } from './pages/NewDonor.js'
import { NewGift } from './pages/NewGift.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ReceiptDetail } from './pages/ReceiptDetail.js'
import { Receipts } from './pages/Receipts.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'

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
              <Route element={<DonorLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/donors" element={<Donors />} />
                <Route path="/donors/new" element={<NewDonor />} />
                <Route path="/donors/:id" element={<DonorDetail />} />
                <Route path="/gifts" element={<Gifts />} />
                <Route path="/gifts/new" element={<NewGift />} />
                <Route path="/gifts/:id" element={<GiftDetail />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/receipts/:id" element={<ReceiptDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}

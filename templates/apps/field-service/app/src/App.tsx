import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ToolbeltLayout } from './components/ToolbeltLayout.js'
import { About } from './pages/About.js'
import { CustomerDetail } from './pages/CustomerDetail.js'
import { Customers } from './pages/Customers.js'
import { Dashboard } from './pages/Dashboard.js'
import { Dispatch } from './pages/Dispatch.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { InvoiceDetail } from './pages/InvoiceDetail.js'
import { Invoices } from './pages/Invoices.js'
import { JobDetail } from './pages/JobDetail.js'
import { Jobs } from './pages/Jobs.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewCustomer } from './pages/NewCustomer.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { QuoteDetail } from './pages/QuoteDetail.js'
import { QuoteEdit } from './pages/QuoteEdit.js'
import { QuoteNew } from './pages/QuoteNew.js'
import { Quotes } from './pages/Quotes.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Technicians } from './pages/Technicians.js'
import { Terms } from './pages/Terms.js'

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
              <Route element={<ToolbeltLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/new" element={<NewCustomer />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/quotes/new" element={<QuoteNew />} />
                <Route path="/quotes/:id" element={<QuoteDetail />} />
                <Route path="/quotes/:id/edit" element={<QuoteEdit />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/dispatch" element={<Dispatch />} />
                <Route path="/technicians" element={<Technicians />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}

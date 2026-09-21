import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Connections } from './pages/Connections.js'
import { EditConnection } from './pages/EditConnection.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Login } from './pages/Login.js'
import { Monitoring } from './pages/Monitoring.js'
import { NewConnection } from './pages/NewConnection.js'
import { NotFound } from './pages/NotFound.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { QueryEditor } from './pages/QueryEditor.js'
import { QueryHistory } from './pages/QueryHistory.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SavedQueryDetail } from './pages/SavedQueryDetail.js'
import { SchemaExplorer } from './pages/SchemaExplorer.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TableBrowser } from './pages/TableBrowser.js'
import { Terms } from './pages/Terms.js'
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
          <AnalyticsRouteListener />
          <Routes>
            <Route path="/" element={<Navigate to="/connections" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route element={<AuthGuard />}>
              <Route path="/connections" element={<Connections />} />
              <Route path="/connections/new" element={<NewConnection />} />
              <Route path="/connections/:connectionId/edit" element={<EditConnection />} />
              <Route path="/query/:connectionId" element={<QueryEditor />} />
              <Route path="/table/:connectionId/:table" element={<TableBrowser />} />
              <Route path="/schema/:connectionId" element={<SchemaExplorer />} />
              <Route path="/history" element={<QueryHistory />} />
              <Route path="/history/saved/:queryId" element={<SavedQueryDetail />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Connections = lazy(() =>
  import('./pages/Connections.js').then((m) => ({ default: m.Connections })),
)
const EditConnection = lazy(() =>
  import('./pages/EditConnection.js').then((m) => ({ default: m.EditConnection })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Monitoring = lazy(() =>
  import('./pages/Monitoring.js').then((m) => ({ default: m.Monitoring })),
)
const NewConnection = lazy(() =>
  import('./pages/NewConnection.js').then((m) => ({ default: m.NewConnection })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const QueryEditor = lazy(() =>
  import('./pages/QueryEditor.js').then((m) => ({ default: m.QueryEditor })),
)
const QueryHistory = lazy(() =>
  import('./pages/QueryHistory.js').then((m) => ({ default: m.QueryHistory })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SavedQueryDetail = lazy(() =>
  import('./pages/SavedQueryDetail.js').then((m) => ({ default: m.SavedQueryDetail })),
)
const SchemaExplorer = lazy(() =>
  import('./pages/SchemaExplorer.js').then((m) => ({ default: m.SchemaExplorer })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TableBrowser = lazy(() =>
  import('./pages/TableBrowser.js').then((m) => ({ default: m.TableBrowser })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

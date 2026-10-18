import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { BranchesLayout } from './components/BranchesLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AddPerson = lazy(() => import('./pages/AddPerson.js').then((m) => ({ default: m.AddPerson })))
const AddRelative = lazy(() =>
  import('./pages/AddRelative.js').then((m) => ({ default: m.AddRelative })),
)
const EditPerson = lazy(() =>
  import('./pages/EditPerson.js').then((m) => ({ default: m.EditPerson })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const People = lazy(() => import('./pages/People.js').then((m) => ({ default: m.People })))
const PersonDetail = lazy(() =>
  import('./pages/PersonDetail.js').then((m) => ({ default: m.PersonDetail })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Tree = lazy(() => import('./pages/Tree.js').then((m) => ({ default: m.Tree })))
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
        <AnalyticsRouteListener />
        <Suspense fallback={null}>
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
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

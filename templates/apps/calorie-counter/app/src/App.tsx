import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NoshAppShell } from './components/NoshAppShell.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const FoodDetail = lazyPage(() =>
  import('./pages/FoodDetail.js').then((m) => ({ default: m.FoodDetail })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Goals = lazyPage(() => import('./pages/Goals.js').then((m) => ({ default: m.Goals })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const LogFood = lazyPage(() => import('./pages/LogFood.js').then((m) => ({ default: m.LogFood })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Onboarding = lazyPage(() =>
  import('./pages/Onboarding.js').then((m) => ({ default: m.Onboarding })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Progress = lazyPage(() =>
  import('./pages/Progress.js').then((m) => ({ default: m.Progress })),
)
const RecipeDetail = lazyPage(() =>
  import('./pages/RecipeDetail.js').then((m) => ({ default: m.RecipeDetail })),
)
const Recipes = lazyPage(() => import('./pages/Recipes.js').then((m) => ({ default: m.Recipes })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Today = lazyPage(() => import('./pages/Today.js').then((m) => ({ default: m.Today })))
const WeightTracking = lazyPage(() =>
  import('./pages/WeightTracking.js').then((m) => ({ default: m.WeightTracking })),
)
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route element={<AuthGuard />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route element={<NoshAppShell />}>
                  <Route path="/today" element={<Today />} />
                  <Route path="/log" element={<LogFood />} />
                  <Route path="/food/:id" element={<FoodDetail />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/recipes" element={<Recipes />} />
                  <Route path="/recipes/:id" element={<RecipeDetail />} />
                  <Route path="/weight" element={<WeightTracking />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

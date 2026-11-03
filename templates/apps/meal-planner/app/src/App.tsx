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
import { SimmerAppShell } from './components/SimmerAppShell.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GroceryList = lazyPage(() =>
  import('./pages/GroceryList.js').then((m) => ({ default: m.GroceryList })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MealPlan = lazyPage(() =>
  import('./pages/MealPlan.js').then((m) => ({ default: m.MealPlan })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Onboarding = lazyPage(() =>
  import('./pages/Onboarding.js').then((m) => ({ default: m.Onboarding })),
)
const Pantry = lazyPage(() => import('./pages/Pantry.js').then((m) => ({ default: m.Pantry })))
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const RecipeDetail = lazyPage(() =>
  import('./pages/RecipeDetail.js').then((m) => ({ default: m.RecipeDetail })),
)
const RecipeEdit = lazyPage(() =>
  import('./pages/RecipeEdit.js').then((m) => ({ default: m.RecipeEdit })),
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
                <Route element={<SimmerAppShell />}>
                  <Route path="/plan" element={<MealPlan />} />
                  <Route path="/recipes" element={<Recipes />} />
                  <Route path="/recipes/new" element={<RecipeEdit />} />
                  <Route path="/recipes/:id" element={<RecipeDetail />} />
                  <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
                  <Route path="/groceries" element={<GroceryList />} />
                  <Route path="/pantry" element={<Pantry />} />
                  <Route path="/settings" element={<Settings />} />
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

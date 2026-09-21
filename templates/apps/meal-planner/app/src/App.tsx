import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SimmerAppShell } from './components/SimmerAppShell.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GroceryList } from './pages/GroceryList.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MealPlan } from './pages/MealPlan.js'
import { NotFound } from './pages/NotFound.js'
import { Onboarding } from './pages/Onboarding.js'
import { Pantry } from './pages/Pantry.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { RecipeDetail } from './pages/RecipeDetail.js'
import { RecipeEdit } from './pages/RecipeEdit.js'
import { Recipes } from './pages/Recipes.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

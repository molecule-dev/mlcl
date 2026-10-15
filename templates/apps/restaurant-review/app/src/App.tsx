import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RestaurantReviewLayout } from './components/RestaurantReviewLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Discover } from './pages/Discover.js'
import { EditReview } from './pages/EditReview.js'
import { Favorites } from './pages/Favorites.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { ListDetail } from './pages/ListDetail.js'
import { Lists } from './pages/Lists.js'
import { Login } from './pages/Login.js'
import { MyReviews } from './pages/MyReviews.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { RestaurantDetail } from './pages/RestaurantDetail.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { WriteReview } from './pages/WriteReview.js'
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            <Route element={<AuthGuard />}>
              <Route element={<RestaurantReviewLayout />}>
                <Route path="/discover" element={<Discover />} />
                <Route path="/restaurants/:id" element={<RestaurantDetail />} />
                <Route path="/restaurants/:id/review" element={<WriteReview />} />
                <Route path="/reviews/:id/edit" element={<EditReview />} />
                <Route path="/my-reviews" element={<MyReviews />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/lists" element={<Lists />} />
                <Route path="/lists/:id" element={<ListDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/users/:id" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RestaurantReviewLayout } from './components/RestaurantReviewLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Discover = lazy(() => import('./pages/Discover.js').then((m) => ({ default: m.Discover })))
const EditReview = lazy(() =>
  import('./pages/EditReview.js').then((m) => ({ default: m.EditReview })),
)
const Favorites = lazy(() => import('./pages/Favorites.js').then((m) => ({ default: m.Favorites })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const ListDetail = lazy(() =>
  import('./pages/ListDetail.js').then((m) => ({ default: m.ListDetail })),
)
const Lists = lazy(() => import('./pages/Lists.js').then((m) => ({ default: m.Lists })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyReviews = lazy(() => import('./pages/MyReviews.js').then((m) => ({ default: m.MyReviews })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RestaurantDetail = lazy(() =>
  import('./pages/RestaurantDetail.js').then((m) => ({ default: m.RestaurantDetail })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WriteReview = lazy(() =>
  import('./pages/WriteReview.js').then((m) => ({ default: m.WriteReview })),
)
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
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

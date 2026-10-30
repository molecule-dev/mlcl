import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ReverbLayout } from './components/ReverbLayout.js'
import { PlayerProvider } from './lib/player.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlbumDetail = lazy(() =>
  import('./pages/AlbumDetail.js').then((m) => ({ default: m.AlbumDetail })),
)
const ArtistDetail = lazy(() =>
  import('./pages/ArtistDetail.js').then((m) => ({ default: m.ArtistDetail })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Library = lazy(() => import('./pages/Library.js').then((m) => ({ default: m.Library })))
const LikedSongs = lazy(() =>
  import('./pages/LikedSongs.js').then((m) => ({ default: m.LikedSongs })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const NowPlaying = lazy(() =>
  import('./pages/NowPlaying.js').then((m) => ({ default: m.NowPlaying })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PlaylistDetail = lazy(() =>
  import('./pages/PlaylistDetail.js').then((m) => ({ default: m.PlaylistDetail })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Queue = lazy(() => import('./pages/Queue.js').then((m) => ({ default: m.Queue })))
const Radio = lazy(() => import('./pages/Radio.js').then((m) => ({ default: m.Radio })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Subscription = lazy(() =>
  import('./pages/Subscription.js').then((m) => ({ default: m.Subscription })),
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
          <PlayerProvider>
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
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route element={<AuthGuard />}>
                  <Route element={<ReverbLayout />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/library/liked" element={<LikedSongs />} />
                    <Route path="/playlists/:id" element={<PlaylistDetail />} />
                    <Route path="/albums/:id" element={<AlbumDetail />} />
                    <Route path="/artists/:id" element={<ArtistDetail />} />
                    <Route path="/radio" element={<Radio />} />
                    <Route path="/now-playing" element={<NowPlaying />} />
                    <Route path="/profile/:handle" element={<Profile />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/queue" element={<Queue />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/plan-updated" element={<PlanUpdated />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </PlayerProvider>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}

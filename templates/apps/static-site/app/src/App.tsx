import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { i18nProvider, themeProvider } from './bonds/index.js'
import { SiteLayout } from './components/SiteLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Post = lazy(() => import('./pages/Post.js').then((m) => ({ default: m.Post })))
const Tag = lazy(() => import('./pages/Tag.js').then((m) => ({ default: m.Tag })))
const Tags = lazy(() => import('./pages/Tags.js').then((m) => ({ default: m.Tags })))

/**
 * The site's routes — the URL space src/content.ts describes. The router
 * around this component is the entry's job: `main.tsx` mounts it in a
 * `BrowserRouter` (dev + hydration) and `entry-server.tsx` renders it in a
 * `StaticRouter` at build time. `/:slug` must stay last: it catches any
 * one-segment path that is not a fixed page.
 */
export function App() {
  return (
    <MoleculeProvider theme={themeProvider} storage={getStorageProvider()} i18n={i18nProvider}>
      {/* Page views on every client-side navigation — no-op without a provider. */}
      <AnalyticsRouteListener />
      <Suspense fallback={null}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/page/:page" element={<Home />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/tags/:tag" element={<Tag />} />
            <Route path="/about" element={<About />} />
            <Route path="/:slug" element={<Post />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </MoleculeProvider>
  )
}

import { Route, Routes } from 'react-router'

import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { i18nProvider, themeProvider } from './bonds/index.js'
import { SiteLayout } from './components/SiteLayout.js'
import { About } from './pages/About.js'
import { Home } from './pages/Home.js'
import { NotFound } from './pages/NotFound.js'

/**
 * The site's routes. The router around this component is the entry's job:
 * `main.tsx` mounts it in a `BrowserRouter` (dev + hydration) and
 * `entry-server.tsx` renders it in a `StaticRouter` at build time. Add a
 * page here AND to `STATIC_PATHS` in entry-server.tsx, or the build will not
 * write its HTML.
 */
export function App() {
  return (
    <MoleculeProvider theme={themeProvider} storage={getStorageProvider()} i18n={i18nProvider}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </MoleculeProvider>
  )
}

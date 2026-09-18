import { Route, Routes } from 'react-router'

import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { i18nProvider, themeProvider } from './bonds/index.js'
import { SiteLayout } from './components/SiteLayout.js'
import { About } from './pages/About.js'
import { Home } from './pages/Home.js'
import { NotFound } from './pages/NotFound.js'
import { Post } from './pages/Post.js'
import { Tag } from './pages/Tag.js'
import { Tags } from './pages/Tags.js'

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
    </MoleculeProvider>
  )
}

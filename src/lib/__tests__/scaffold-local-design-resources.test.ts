/** The generated shell must use the selected fonts without an extra CDN dependency. */
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { chromium } from '@playwright/test'
import { build, preview } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

import { loadRegistry } from '../registry.js'
import { createAppProject, generateFontHtml, getTemplatesDir } from '../scaffold.js'
import type { InferredPackage } from '../schema.js'

const require = createRequire(import.meta.url)
const roots: string[] = []
const packages = loadRegistry('app')
const textFont = '@molecule/app-fonts-arimo'
const iconFont = '@molecule/app-fonts-ionicons'

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function scaffold(
  framework: string,
  names = [textFont, iconFont],
  fleet = packages,
): Promise<{ root: string; fonts: ReturnType<typeof generateFontHtml> }> {
  const root = await mkdtemp(join(tmpdir(), 'scaffold-local-design-'))
  roots.push(root)
  const fonts = generateFontHtml(names, fleet)
  await createAppProject(root, 'equipment-console', framework, false, fonts.html)
  return { root, fonts }
}

describe('the scaffold shell uses its declared font providers', () => {
  it.each(['react', 'vue', 'solid', 'angular', 'react-native-web', 'svelte'])(
    'adds no unselected external font resources to %s',
    async (framework) => {
      const { root } = await scaffold(framework)
      const html = await readFile(
        join(root, framework === 'svelte' ? 'src/app.html' : 'index.html'),
        'utf8',
      )
      expect(html).not.toMatch(/(?:href|src)=["']https?:\/\//)
      expect(html).toContain("font-family: 'Arimo'")
      expect(html).toContain("font-family: 'Ionicons'")
      expect(html).toContain('/fonts/ionicons.woff')
      expect(html).toContain('.ion-trash-a:before')
    },
  )

  it('keeps an explicitly selected CDN provider instead of substituting another font', async () => {
    const name = '@molecule/app-fonts-equipment'
    const provider = packages.find((pkg) => pkg.name === textFont)!
    const fleet: InferredPackage[] = [
      {
        ...provider,
        name,
        molecule: {
          ...provider.molecule!,
          font: {
            family: 'Equipment Sans',
            source: 'cdn',
            url: 'https://fonts.example/equipment.css',
            preconnect: ['https://fonts.example'],
          },
        },
      },
    ]
    const { root } = await scaffold('react', [name], fleet)
    const html = await readFile(join(root, 'index.html'), 'utf8')
    expect(html).toContain('href="https://fonts.example/equipment.css" rel="stylesheet"')
    expect(html).not.toContain('fonts.googleapis.com')
  })

  it('builds a non-benchmark editor with local fonts and no external font requests across reloads', async () => {
    const { root, fonts } = await scaffold('react', [textFont])
    await symlink(
      dirname(dirname(require.resolve('vite/package.json'))),
      join(root, 'node_modules'),
    )
    for (const face of fonts.fontFiles) {
      const target = join(root, 'public/fonts', face.file)
      await mkdir(dirname(target), { recursive: true })
      // The CLI's own curated font pool is available in standalone CI too.
      await copyFile(join(getTemplatesDir(), 'shared/fonts', face.file), target)
    }
    // Use the real generated shell, local font assets and Vite production build.
    // A small equipment editor isolates document loading from auth and save latency.
    await writeFile(
      join(root, 'src/main.tsx'),
      `document.getElementById('root').innerHTML = '<form><input name="title" aria-label="Equipment"><button>Save equipment</button></form>'
document.body.style.fontFamily = 'Arimo'
document.querySelector('form').onsubmit = async (event) => {
  event.preventDefault()
  const answer = await fetch('/api/equipment', { method: 'POST' })
  const saved = await answer.json()
  history.pushState({}, '', '/equipment/' + saved.id)
}
`,
    )
    await build({ root, configFile: false, logLevel: 'silent' })
    const server = await preview({
      root,
      configFile: false,
      logLevel: 'silent',
      preview: { host: '127.0.0.1', port: 0, strictPort: true },
    })
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
    try {
      browser = await chromium.launch({ headless: true })
      const address = server.httpServer.address()
      if (!address || typeof address === 'string') throw new Error('No preview TCP port')
      const page = await browser.newPage()
      const remote: string[] = []
      let saves = 0
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url())
        if (url.hostname !== '127.0.0.1') {
          remote.push(url.href)
          // Keep an unintended external request pending so this test cannot use its response.
          return
        }
        if (url.pathname === '/api/equipment') {
          await route.fulfill({ json: { id: ++saves } })
        } else {
          await route.continue()
        }
      })
      for (let i = 0; i < 4; i++) {
        await page.goto(`http://127.0.0.1:${address.port}/editor`, {
          waitUntil: 'load',
          timeout: 10_000,
        })
        await page.getByRole('textbox', { name: 'Equipment' }).fill(`Equipment ${i}`)
        await page.getByRole('button', { name: 'Save equipment' }).click()
        await page.waitForURL(`**/equipment/${i + 1}`)
      }
      expect(remote).toEqual([])
      expect(saves).toBe(4)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.fonts.check('16px Arimo'))).toBe(true)
    } finally {
      try {
        await browser?.close()
      } finally {
        server.httpServer.closeAllConnections()
        await new Promise<void>((resolve, reject) => {
          server.httpServer.close((error) => (error ? reject(error) : resolve()))
        })
      }
    }
  })
})

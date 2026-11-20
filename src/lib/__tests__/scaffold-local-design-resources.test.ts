/** The generated shell must use the selected fonts without an extra CDN dependency. */
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from '@playwright/test'
import { build, preview } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

import { loadRegistry } from '../registry.js'
import { copyFontFiles, createAppProject, generateFontHtml, getTemplatesDir } from '../scaffold.js'
import type { InferredPackage } from '../schema.js'
import { generatedEntry } from './generated-entry.js'

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
      expect(html).toContain('/fonts/ionicons.woff2')
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
    const provider = packages.find((pkg) => pkg.name === textFont)!
    const sources = {
      'Equipment-Latin.woff2': 'Inter-VariableFont.woff2',
      'Equipment-Full.ttf': 'Arimo-VariableFont_wght.ttf',
    }
    const { root, fonts } = await scaffold(
      'react',
      [textFont],
      [
        {
          ...provider,
          molecule: {
            ...provider.molecule!,
            font: {
              family: 'Equipment Sans',
              role: 'sans',
              source: 'local',
              faces: [
                { file: 'Equipment-Latin.woff2', weight: 400, unicodeRange: 'U+0000-00FF' },
                { file: 'Equipment-Full.ttf', weight: 400, unicodeRange: 'U+0400-04FF' },
              ],
            },
          },
        },
      ],
    )
    for (const face of fonts.fontFiles) {
      const installed = join(root, 'node_modules', face.packageName, face.fontsDir)
      await mkdir(installed, { recursive: true })
      // Real font binaries from the existing pool keep the browser test runnable in standalone CI.
      await copyFile(
        join(getTemplatesDir(), 'shared/fonts', sources[face.file as keyof typeof sources]),
        join(installed, face.file),
      )
    }
    expect(await copyFontFiles(root, fonts.fontFiles)).toEqual([])
    // Use the real generated shell, local font assets and Vite production build.
    // A small equipment editor isolates document loading from auth and save latency.
    await writeFile(
      join(root, await generatedEntry(root)),
      `document.getElementById('root').innerHTML = '<form><input name="title" aria-label="Equipment"><button>Save equipment</button></form>'
document.body.style.fontFamily = 'Equipment Sans'
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
      const localFonts: string[] = []
      let saves = 0
      page.on('response', (response) => {
        if (response.request().resourceType() === 'font' && response.ok()) {
          localFonts.push(new URL(response.url()).pathname)
        }
      })
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
      expect(new Set(localFonts)).toEqual(new Set(['/fonts/Equipment-Latin.woff2']))
      const full = page.waitForResponse(
        (response) => response.url().endsWith('/fonts/Equipment-Full.ttf') && response.ok(),
      )
      await page.evaluate(() => {
        const text = document.createElement('p')
        text.textContent = 'Привет мир'
        document.body.append(text)
      })
      await full
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

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearRegistryCache, getRegistryPath } from '../registry.js'
import { createShowcaseProject, showcaseBasePort, VISUAL_TEST_FRAMEWORKS } from '../visual-test.js'

let scratch: string
let registry: {
  toolchain: { shared: Record<string, string>; app: Record<string, string> }
  appFrameworks: Record<
    string,
    { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  >
  packages: Record<string, { buildTooling?: { devDependencies?: Record<string, string> } }>
}

beforeEach(async () => {
  registry = JSON.parse(await readFile(getRegistryPath(), 'utf8'))
  scratch = await mkdtemp(join(tmpdir(), 'showcase-manifest-'))
  const path = join(scratch, 'registry.json')
  await writeFile(path, JSON.stringify(registry))
  vi.stubEnv('MLCL_REGISTRY_PATH', path)
  clearRegistryCache()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  clearRegistryCache()
  await rm(scratch, { recursive: true, force: true })
})

describe('showcase install manifests', () => {
  it.each(VISUAL_TEST_FRAMEWORKS)('%s uses the current registry pins', async (framework) => {
    const directory = await createShowcaseProject(framework, scratch)
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).toEqual(registry.appFrameworks[framework].dependencies ?? {})
    expect(manifest.devDependencies).toEqual({
      vite: registry.toolchain.app.vite,
      typescript: registry.toolchain.shared.typescript,
      ...registry.packages['@molecule/app-styling-tailwind'].buildTooling?.devDependencies,
      ...registry.appFrameworks[framework].devDependencies,
    })
    expect(await readFile(join(directory, 'src/vite-env.d.ts'), 'utf8')).toContain('vite/client')
  })

  it('follows later toolchain and framework pin changes without a source table update', async () => {
    registry.toolchain.app.vite = '99.0.0'
    registry.toolchain.shared.typescript = '99.1.0'
    registry.appFrameworks.vue.devDependencies!['@vitejs/plugin-vue'] = '99.2.0'
    await writeFile(join(scratch, 'registry.json'), JSON.stringify(registry))
    clearRegistryCache()
    const directory = await createShowcaseProject('vue', scratch)
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    expect(manifest.devDependencies).toMatchObject({
      vite: '99.0.0',
      typescript: '99.1.0',
      '@vitejs/plugin-vue': '99.2.0',
    })
  })

  it('uses the scaffold’s React Native Web compatibility module and CSS imports', async () => {
    const directory = await createShowcaseProject('react-native-web', scratch)
    const config = await readFile(join(directory, 'vite.config.ts'), 'utf8')
    expect(config).toContain("'src/react-native-web.js'")
    const runtime = await readFile(join(directory, 'src', 'react-native-web.js'), 'utf8')
    const template = await readFile(
      new URL('../../../templates/app/react-native-web/react-native-web.js.tpl', import.meta.url),
      'utf8',
    )
    expect(runtime).toBe(template)

    const css = await readFile(join(directory, 'src', 'index.css'), 'utf8')
    expect(css).toMatch(/^@import 'tailwindcss\/utilities\.css';$/m)
    const react = await createShowcaseProject('react', scratch)
    expect(await readFile(join(react, 'src', 'index.css'), 'utf8')).toContain(
      "@import 'tailwindcss';",
    )
  })

  it('refuses missing framework metadata rather than inventing fallback versions', async () => {
    delete registry.appFrameworks.vue
    await writeFile(join(scratch, 'registry.json'), JSON.stringify(registry))
    clearRegistryCache()
    await expect(createShowcaseProject('vue', scratch)).rejects.toThrow(/framework.*vue/i)
  })
})

// Two parity runs on one machine (a coordinator and a fixer) need separate port ranges.
describe('showcase base port', () => {
  it('is 5200 unless MOLECULE_SHOWCASE_BASE_PORT moves it, and refuses a value that is not a port', () => {
    expect(showcaseBasePort(undefined)).toBe(5200)
    expect(showcaseBasePort('')).toBe(5200)
    expect(showcaseBasePort('5300')).toBe(5300)
    expect(() => showcaseBasePort('53oo')).toThrow(/MOLECULE_SHOWCASE_BASE_PORT/)
    expect(() => showcaseBasePort('80')).toThrow(/1024 to 65000/)
  })
})

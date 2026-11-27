/**
 * A showcase gets its `@molecule/*` packages the way CI has no workspace to link them from, and a
 * run covers the frameworks it names.
 *
 * Inside molecule-workspace a showcase links the molecule checkout beside mlcl
 * (`MOLECULE_SHOWCASE_PACKAGES` unset). mlcl's own CI checks mlcl out alone, so there the showcase
 * declares, at the pins registry.json writes, each `@molecule/*` package its own files use and the
 * required peers beside them, and installs them from npm under the scaffold's `.npmrc`
 * (`MOLECULE_SHOWCASE_PACKAGES=npm`). A showcase that installs without a package its stylesheet
 * scans, or with a peer nobody declared, is a showcase whose dev server fails on an import.
 *
 * `MOLECULE_SHOWCASE_FRAMEWORKS` names the frameworks a run starts and compares; each keeps its
 * own port. CI's matrix runs one framework beside React through it.
 *
 * @module
 */

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMoleculeVersion, getRegistryPath } from '../registry.js'
import {
  BASE_PORT,
  comparedFrameworks,
  createShowcaseProject,
  showcaseFrameworks,
  showcasePackageSource,
  showcasePort,
  usedMoleculePackages,
  VISUAL_TEST_FRAMEWORKS,
} from '../visual-test.js'

const SHOWCASE_TEMPLATES = new URL('../../../templates/showcase/', import.meta.url)
const OTHER_FRAMEWORKS = VISUAL_TEST_FRAMEWORKS.filter((framework) => framework !== 'react')

/** The parts of registry.json these tests read. */
type Registry = {
  appFrameworks: Record<string, { dependencies?: Record<string, string> }>
  packages: Record<string, { moleculePeers?: string[] }>
}

let scratch: string
let registry: Registry

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'showcase-packages-'))
  registry = JSON.parse(await readFile(getRegistryPath(), 'utf8'))
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(scratch, { recursive: true, force: true })
})

/**
 * The name of a showcase framework's UI kit, as its showcase's own file imports it.
 *
 * @param framework - The framework.
 * @returns The package name.
 */
async function kitOf(framework: string): Promise<string> {
  const file = (await readdir(new URL(framework, SHOWCASE_TEMPLATES))).find((name) =>
    /^Showcase\./.test(name),
  )
  const source = await readFile(new URL(`${framework}/${file}`, SHOWCASE_TEMPLATES), 'utf8')
  const kit = source.match(/from '@molecule\/(app-ui-[\w-]+)'/)
  if (!kit) throw new Error(`templates/showcase/${framework}/Showcase imports no UI kit`)
  return `@molecule/${kit[1]}`
}

describe('showcase package source', () => {
  it.each([
    [undefined, 'workspace'],
    ['', 'workspace'],
    ['workspace', 'workspace'],
    ['npm', 'npm'],
  ] as const)('reads %s as %s', (value, source) => {
    expect(showcasePackageSource(value)).toBe(source)
  })

  it('refuses any other value by name', () => {
    expect(() => showcasePackageSource('registry')).toThrow(
      /MOLECULE_SHOWCASE_PACKAGES must be "workspace" or "npm", got "registry"/,
    )
  })
})

describe('showcase install manifests', () => {
  it.each(VISUAL_TEST_FRAMEWORKS)(
    '%s installs from npm the packages its files use, at the registry pins, with their required peers',
    async (framework) => {
      vi.stubEnv('MOLECULE_SHOWCASE_PACKAGES', 'npm')
      const directory = await createShowcaseProject(framework, scratch)
      const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
      const molecule = Object.keys(manifest.dependencies).filter((name) =>
        name.startsWith('@molecule/'),
      )

      // What the showcase reads: its kit, the catalogue, the bonds file's packages, and the one only its
      // stylesheet names.
      for (const name of [
        await kitOf(framework),
        '@molecule/app-ui-showcase',
        '@molecule/app-ui',
        '@molecule/app-ui-tailwind',
        '@molecule/app-styling-tailwind',
      ])
        expect(molecule, `${framework} installs ${name}`).toContain(name)

      // Each at the pin a scaffolded project writes, never a range.
      for (const name of molecule)
        expect(manifest.dependencies[name], `${name} is pinned`).toBe(getMoleculeVersion(name))

      // Each declared package's required peers are declared beside it, as in a scaffolded project.
      for (const name of molecule)
        for (const peer of registry.packages[name].moleculePeers ?? [])
          expect(molecule, `${name} requires ${peer}`).toContain(peer)

      expect(manifest.dependencies).toMatchObject(
        registry.appFrameworks[framework].dependencies ?? {},
      )
      expect(await readFile(join(directory, '.npmrc'), 'utf8')).toContain('legacy-peer-deps=true')
    },
  )

  it('links the workspace by default: no @molecule dependency, no .npmrc', async () => {
    const directory = await createShowcaseProject('react', scratch)
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
    expect(
      Object.keys(manifest.dependencies).filter((name) => name.startsWith('@molecule/')),
    ).toEqual([])
    await expect(readFile(join(directory, '.npmrc'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

describe('packages a showcase uses', () => {
  beforeEach(async () => {
    const project = join(scratch, 'showcase')
    await mkdir(project)
    await writeFile(
      join(project, 'a.ts'),
      [
        "// from '@molecule/app-line-comment'",
        "/* import '@molecule/app-block-comment' */",
        "import one from '@molecule/app-one'",
        "import two from '@molecule/app-two/sub'",
        "export * from '@molecule/app-three'",
        "const lazy = () => import('@molecule/app-four')",
        "const mentions = '@molecule/app-bare'",
        '',
      ].join('\n'),
    )
    await writeFile(
      join(project, 'b.svelte'),
      [
        "<!-- from '@molecule/app-markup' -->",
        '<script lang="ts">',
        "  // import '@molecule/app-script-comment'",
        "  import { five } from '@molecule/app-five'",
        '</script>',
        '<div data-path="node_modules/@molecule/app-attribute/dist" />',
        '',
      ].join('\n'),
    )
    await writeFile(join(project, 'c.css'), '@source "../node_modules/@molecule/app-six/dist";\n')
    await writeFile(
      join(project, 'd.txt'),
      'node_modules/@molecule/app-seven/dist\n@molecule/app-eight\n',
    )
    await mkdir(join(project, 'node_modules', '@molecule', 'app-nine'), { recursive: true })
    await writeFile(join(project, 'node_modules', '@molecule', 'app-nine', 'package.json'), '{}')
  })

  it('lists every imported package and every named package directory, and nothing only mentioned', async () => {
    expect(await usedMoleculePackages(join(scratch, 'showcase'))).toEqual([
      // A script import (static, re-export or dynamic), a subpath import's package, a single-file
      // component's script, a package directory a stylesheet, a markup attribute or any text names.
      '@molecule/app-attribute',
      '@molecule/app-five',
      '@molecule/app-four',
      '@molecule/app-one',
      '@molecule/app-seven',
      '@molecule/app-six',
      '@molecule/app-three',
      '@molecule/app-two',
      // Not a comment in or around a script, a bare name, or a directory inside node_modules.
    ])
  })

  it('is empty for a project that uses none', async () => {
    await mkdir(join(scratch, 'empty'))
    expect(await usedMoleculePackages(join(scratch, 'empty'))).toEqual([])
  })
})

describe('frameworks of a run', () => {
  it.each([
    [undefined, [...VISUAL_TEST_FRAMEWORKS]],
    ['', [...VISUAL_TEST_FRAMEWORKS]],
    [' , ', [...VISUAL_TEST_FRAMEWORKS]],
    ['react', ['react']],
    ['svelte, vue', ['react', 'vue', 'svelte']],
    ['react-native-web, react ,solid', ['react', 'solid', 'react-native-web']],
  ] as const)('reads %j as %j', (value, frameworks) => {
    expect(showcaseFrameworks(value)).toEqual(frameworks)
  })

  it('refuses a name that is not a showcase framework, listing the ones it takes', () => {
    expect(() => showcaseFrameworks('vue, expo')).toThrow(
      /MOLECULE_SHOWCASE_FRAMEWORKS names expo; expected a comma-separated list of react, vue, svelte, solid, angular, react-native-web/,
    )
  })

  it('compares every other framework by default, and only the named ones otherwise', () => {
    vi.stubEnv('MOLECULE_SHOWCASE_FRAMEWORKS', '')
    expect(comparedFrameworks()).toEqual(OTHER_FRAMEWORKS)
    vi.stubEnv('MOLECULE_SHOWCASE_FRAMEWORKS', 'react-native-web, react')
    expect(comparedFrameworks()).toEqual(['react-native-web'])
  })

  it('gives each framework a port of its own, which a run that starts only some showcases keeps', () => {
    // Svelte is third in VISUAL_TEST_FRAMEWORKS, so its showcase is always on the base port + 2,
    // beside React's or not: another run can predict where a framework's showcase answers.
    expect(
      showcaseFrameworks('svelte').map((framework) => showcasePort(framework) - BASE_PORT),
    ).toEqual([0, 2])
    expect(VISUAL_TEST_FRAMEWORKS.map((framework) => showcasePort(framework) - BASE_PORT)).toEqual(
      VISUAL_TEST_FRAMEWORKS.map((_, index) => index),
    )
  })
})

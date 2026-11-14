/** Executable framework recipes delivered beside the app's pages, using its declared packages. */
import { mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'

import { ts } from 'ts-morph'

import type { DeclaredPackage } from './capability-map.js'
import { formatGeneratedSource } from './format.js'
import type { Registry } from './schema.js'

/**
 * Write framework compositions only when every imported package is declared in that workspace.
 * Existing app code stays app-owned. A template is executable source, not a second package catalog.
 * @param root - The project root.
 * @param templates - mlcl's templates directory.
 * @param registry - Registry that identifies the project's frameworks.
 * @param declared - The project's package declarations.
 * @returns Project-relative recipe paths available to the builder.
 */
export async function writeFrameworkRecipes(
  root: string,
  templates: string,
  registry: Registry,
  declared: readonly DeclaredPackage[],
): Promise<string[]> {
  const paths = new Set<string>()
  const boundary = await realpath(root)
  const inside = async (path: string): Promise<void> => {
    const resolved = relative(boundary, await realpath(path))
    if (resolved === '..' || resolved.startsWith(`..${sep}`) || isAbsolute(resolved))
      throw new Error(`Refusing a framework recipe outside the project: ${path}`)
  }
  for (const workspace of new Set(declared.map((item) => item.workspace))) {
    const names = new Set(
      declared.filter((item) => item.workspace === workspace).map((item) => item.name),
    )
    const frameworks = new Set(
      [...names]
        .map((name) => registry.packages[name]?.framework)
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    )
    for (const framework of frameworks) {
      const directory = join(templates, 'recipes', framework)
      let files: string[]
      try {
        files = await readdir(directory)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
        throw error
      }
      for (const name of files.filter((file) => /\.tsx?\.tpl$/.test(file))) {
        const source = await readFile(join(directory, name), 'utf8')
        const requirements = [
          ...source.matchAll(/@requires\s+(@molecule\/[\w-]+)\s+(\d+\.\d+\.\d+)/g),
        ]
        let manifest: {
          dependencies?: Record<string, string>
          devDependencies?: Record<string, string>
        }
        try {
          manifest = JSON.parse(
            await readFile(join(root, workspace, 'package.json'), 'utf8'),
          ) as typeof manifest
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
          throw error
        }
        if (
          !requirements.every(([, pkg, minimum]) => {
            const value = manifest.dependencies?.[pkg] ?? manifest.devDependencies?.[pkg] ?? ''
            if (/^(?:workspace:|file:|link:)/.test(value)) return true
            if (!/^\d+\.\d+\.\d+$/.test(value)) return false
            const have = value.split('.').map(Number),
              need = minimum.split('.').map(Number)
            for (let i = 0; i < 3; i++) if (have[i] !== need[i]) return have[i] > need[i]
            return true
          })
        )
          continue
        const ast = ts.createSourceFile(
          name.replace(/\.tpl$/, ''),
          source,
          ts.ScriptTarget.Latest,
          true,
        )
        const imports = ast.statements
          .filter(ts.isImportDeclaration)
          .map((node) => (node.moduleSpecifier as ts.StringLiteral).text)
          .filter((name) => name.startsWith('@molecule/'))
        if (!imports.every((name) => names.has(name))) continue
        const path = join(workspace, 'src', 'recipes', name.replace(/\.tpl$/, ''))
        const target = join(root, path)
        let parent = join(root, workspace)
        await inside(parent)
        for (const segment of ['src', 'recipes']) {
          parent = join(parent, segment)
          await mkdir(parent, { recursive: true })
          await inside(parent)
        }
        try {
          await writeFile(target, await formatGeneratedSource(source, target), { flag: 'wx' })
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        }
        paths.add(path)
      }
    }
  }
  return [...paths]
}

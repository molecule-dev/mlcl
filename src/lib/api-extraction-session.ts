/** Compiler work shared by the independent package programs in one docs generation. */
import { readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

import { createWrappedNode, Project, type SourceFile, ts } from 'ts-morph'

/** A read-only source snapshot. Discard it before generating from changed inputs. */
export interface ApiExtractionSession {
  getIndexFile(packageDir: string): SourceFile | undefined
}

// Syntax trees and bound symbols cost much more than their source text. Keep
// a hot working set, including the common libs, rather than retaining the fleet.
// This also fits the docs check workers' 2 GiB heaps. Count UTF-16 bytes.
const MAX_CACHED_SOURCE_BYTES = 32 * 1024 * 1024

/**
 * Share parsed/bound files and resolutions, never a program or a checker. Each
 * package keeps exactly its own src roots and transitive closure, so another
 * package's global scripts and module augmentations cannot change its README.
 * Only source files survive extraction; completed checkers can be collected.
 */
export function createApiExtractionSession(
  sourcePackages?: ReadonlyMap<string, string>,
): ApiExtractionSession {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.Preserve,
    declaration: true,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    // Include Node's ambient Buffer/process/NodeJS types, as the old Project did.
    types: ['node'],
  }
  // One empty Project supplies ts-morph's bundled libraries through its public
  // host. It never receives package roots or creates a package program. Using
  // the installed `typescript` libraries instead changes inferred type text.
  const project = new Project({ compilerOptions, skipAddingFilesFromTsConfig: true })
  const moduleHost = project.getModuleResolutionHost()
  const files = new Map<string, ts.SourceFile>()
  let cachedSourceBytes = 0
  const pathsByPackage = new Map<string, Record<string, string[]>>()
  const resolutions = new Map<string, ts.ResolvedModuleFull | undefined>()
  const reads = new Map<string, string | undefined>()
  const host = ts.createCompilerHost(compilerOptions, true)
  Object.assign(host, moduleHost)
  host.readFile = (file) => {
    if (!reads.has(file)) reads.set(file, moduleHost.readFile(file))
    return reads.get(file)
  }
  // This is ts-morph's default virtual lib folder, served by moduleHost even
  // when no /node_modules directory exists on disk. Keep its original paths.
  host.getDefaultLibFileName = (options) =>
    `/node_modules/typescript/lib/${ts.getDefaultLibFileName(options)}`
  host.getDefaultLibLocation = () => '/node_modules/typescript/lib'
  host.getCanonicalFileName = (file) => resolve(file)
  host.useCaseSensitiveFileNames = () => true
  host.getSourceFile = (file, languageVersionOrOptions) => {
    const path = resolve(file)
    let source = files.get(path)
    if (source) {
      files.delete(path)
      files.set(path, source)
    } else {
      if (!host.fileExists(path)) return undefined
      const text = host.readFile(path)
      if (text === undefined) return undefined
      // Parse with the options the program passes, as tsc does: they carry the file's implied
      // module format and module detection. A file in a "type": "module" package is a module
      // without any import or export, so its `declare module 'x'` augments x; parsed as a script,
      // it declared an ambient module that replaced x for the whole program (2026-11-25: every
      // IconName read as any once @molecule/app-ide-panel-logic was in the program).
      source = ts.createSourceFile(path, text, languageVersionOrOptions, true)
      const bytes = text.length * 2
      if (bytes <= MAX_CACHED_SOURCE_BYTES) {
        while (cachedSourceBytes + bytes > MAX_CACHED_SOURCE_BYTES) {
          const oldest = files.keys().next().value!
          cachedSourceBytes -= files.get(oldest)!.text.length * 2
          files.delete(oldest)
        }
        files.set(path, source)
        cachedSourceBytes += bytes
      }
    }
    return source
  }
  host.resolveModuleNames = (names, from, _reused, redirected, options, sourceFile) => {
    return names.map((name, index) => {
      const mode = sourceFile && ts.getModeForResolutionAtIndex(sourceFile, index, options)
      const key = JSON.stringify([name, from, mode])
      if (resolutions.has(key)) return resolutions.get(key)
      const packageName = name.startsWith('@molecule/')
        ? name.split('/').slice(0, 2).join('/')
        : undefined
      const siblingDir = packageName && sourcePackages?.get(packageName)
      let paths: Record<string, string[]> | undefined
      if (siblingDir && packageName) {
        paths = pathsByPackage.get(packageName)
        if (!paths) {
          paths = packageSourcePaths(packageName, siblingDir)
          pathsByPackage.set(packageName, paths)
        }
      }
      const resolved = ts.resolveModuleName(
        name,
        from,
        paths ? { ...options, paths } : options,
        host,
        undefined,
        redirected,
        mode,
      ).resolvedModule
      // A missing source must not fall back to stale installed declarations.
      // Unresolved asset imports still contribute no declarations and are fine.
      if (
        siblingDir &&
        resolved &&
        !resolved.resolvedFileName.startsWith(join(siblingDir, 'src') + sep)
      ) {
        throw new Error(`Cannot resolve documented source for ${name} imported by ${from}`)
      }
      resolutions.set(key, resolved)
      return resolved
    })
  }

  return {
    getIndexFile(packageDir) {
      const srcDir = join(packageDir, 'src')
      const indexPath = join(srcDir, 'index.ts')
      // Use the same glob and filesystem as Project.addSourceFilesAtPaths,
      // including TSX, declaration files and unimported global scripts/tests.
      const rootNames = project.getFileSystem().globSync([join(srcDir, '**/*.{ts,tsx}')])
      if (!rootNames.includes(indexPath)) return undefined
      const program = ts.createProgram({ rootNames, options: compilerOptions, host })
      const index = program.getSourceFile(indexPath)!
      return createWrappedNode(index, { typeChecker: program.getTypeChecker(), compilerOptions })
    },
  }
}

/** Resolve public sibling entry points from the documented tree's own manifest. */
function packageSourcePaths(name: string, packageDir: string): Record<string, string[]> {
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
    types?: string
    main?: string
    exports?: unknown
  }
  const targets = (value: unknown): string[] => {
    if (typeof value === 'string') {
      if (!/^(?:\.\/)?(?:dist|src)\//.test(value)) return []
      return [
        join(packageDir, value.replace(/^(?:\.\/)?dist\//, 'src/').replace(/\.d\.ts$/, '.js')),
      ]
    }
    if (!value || typeof value !== 'object') return []
    return [...new Set(Object.values(value).flatMap(targets))]
  }
  const paths: Record<string, string[]> = {
    [name]: [join(packageDir, 'src/index.js')],
    [`${name}/*`]: [join(packageDir, 'src/*')],
  }
  if (pkg.exports && typeof pkg.exports === 'object') {
    for (const [key, value] of Object.entries(pkg.exports)) {
      const mapped = targets(value)
      if (mapped.length && (key === '.' || key.startsWith('./'))) {
        paths[key === '.' ? name : `${name}/${key.slice(2)}`] = mapped
      }
    }
  }
  const rootExport =
    pkg.exports && typeof pkg.exports === 'object' && '.' in pkg.exports
      ? pkg.exports['.']
      : pkg.exports
  const rootTargets = targets(rootExport ?? pkg.types ?? pkg.main)
  if (rootTargets.length) paths[name] = rootTargets
  return paths
}

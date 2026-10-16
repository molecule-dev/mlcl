/**
 * TypeScript API extractor using ts-morph.
 *
 * Extracts public API surface (exports, JSDoc, type signatures) from
 * molecule packages. Used by the docs generator to produce README.md files.
 *
 * @module
 */

import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'

import {
  type ExportedDeclarations,
  type JSDoc,
  type JSDocTag,
  Node,
  Project,
  type SourceFile,
} from 'ts-morph'

// ============================================================================
// Types
// ============================================================================

export interface ExtractedParam {
  name: string
  type: string
  description?: string
  optional?: boolean
}

export interface ExtractedExport {
  name: string
  kind: 'function' | 'type' | 'interface' | 'const' | 'enum' | 'class' | 'namespace'
  signature?: string
  /** Full TypeScript declaration text for rendering in code blocks */
  declaration?: string
  description?: string
  params?: ExtractedParam[]
  returnType?: string
  /** @returns JSDoc text (separate from returnType which is the TS type) */
  returnDescription?: string
  deprecated?: boolean
  /**
   * The file declaring this export, relative to the package's `src/`
   * (e.g. `authorization.ts`). Carried so a README block that had to be
   * truncated can point at the one place the full text survives in an
   * installed package: `dist/<same path>.d.ts`.
   *
   * Undefined when the declaration lives OUTSIDE the package's own `src/` —
   * i.e. it is a third-party module the package re-exports.
   */
  sourceFile?: string
  /**
   * For a declaration that lives outside the package — a re-exported
   * dependency's type — its path below `node_modules` (e.g.
   * `@playwright/test/types/types.d.ts`). The truncation pointer prefers this
   * over the package's own `dist/`, which does not contain those types.
   */
  externalSource?: string
  /**
   * For a namespace that re-exports a THIRD-PARTY module (`export { z }` of
   * `import { z } from 'zod'`), the module's name. Such a namespace is a door
   * to someone else's API, not this package's surface — inlining its several
   * hundred members buries the package's own docs.
   */
  externalModule?: string
  /**
   * For `export * as ns` namespaces: the members re-exported under the
   * namespace, with the SAME detail as a top-level export (signature,
   * declaration, `@param`/`@returns`). A bare name+kind+first-line list forces
   * the reader to go read the .d.ts for anything beyond a summary.
   */
  members?: ExtractedExport[]
}

/** Extraction context threaded through a declaration and its namespace members. */
interface ExtractContext {
  /** Absolute path of the package's `src/`. A declaration outside it is a third-party re-export. */
  srcDir: string
  /** Root of the tree being documented — the anchor for {@link sourceOrderKey}. */
  rootDir: string
  /** 0 for a top-level export, 1 for a namespace member (members do not recurse further). */
  depth: number
}

export interface ExtractedModule {
  /** Module-level JSDoc description from src/index.ts */
  description?: string
  /** @example blocks from module-level JSDoc */
  examples?: string[]
  /** @remarks block from module-level JSDoc (rendered as markdown) */
  remarks?: string
  /**
   * @e2e block from module-level JSDoc — the general functionality an AI
   * executor should drive end-to-end to verify the package is properly
   * integrated. Rendered as the "## E2E Tests" section of README.md.
   */
  e2e?: string
  /** All public exports with their JSDoc + type info */
  exports: ExtractedExport[]
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Extract the public API surface of a molecule package.
 *
 * @param packageDir - Absolute path to the package root (containing package.json)
 * @param options - `rootDir` is the root of the tree being documented (molecule's
 *   own root). It anchors the export order only — see {@link sourceOrderKey} — so
 *   passing the real root keeps a `git archive` export's output byte-identical to
 *   the live checkout's. Derived from `packageDir` when omitted.
 * @returns Extracted module information including exports and module-level JSDoc
 */
export function extractPackageApi(
  packageDir: string,
  options: { rootDir?: string } = {},
): ExtractedModule {
  const srcDir = join(packageDir, 'src')
  const indexPath = join(srcDir, 'index.ts')
  const rootDir = options.rootDir ?? packageTreeRoot(packageDir) ?? packageDir

  const project = new Project({
    compilerOptions: {
      target: 99, // ESNext
      module: 199, // NodeNext
      moduleResolution: 99, // NodeNext
      declaration: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      // Load @types/node's ambient globals (the global `Buffer`, `process`,
      // `NodeJS.*`). Without this, the in-memory ts-morph Project never pulls
      // @types/node into global scope, so any signature referencing the global
      // `Buffer` collapses to `any` in the generated README.md (e.g. jwt's
      // JWT_PRIVATE_KEY: `string | Buffer<ArrayBufferLike>` → `any`). This only
      // governs ambient-global inclusion — types imported explicitly (e.g.
      // `import type { ReactNode } from 'react'`) resolve via module resolution
      // regardless, so app/react/vue/etc. packages are unaffected.
      types: ['node'],
    },
    skipAddingFilesFromTsConfig: true,
  })

  // Add only the files in the package src directory
  // Include .tsx — component packages (app/features/*) re-export their public API
  // from .tsx files (`export * from './Foo.js'` → Foo.tsx). Globbing only .ts left
  // getExportedDeclarations() unable to resolve those re-exports, so 141 component
  // packages rendered NO API section at all (props undocumented → the executor falls
  // back to cat-ing the .d.ts, the dominant custom-build cost).
  project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'))

  const indexFile = project.getSourceFile(indexPath)
  if (!indexFile) {
    return { exports: [] }
  }

  // Extract module-level JSDoc from index.ts
  const moduleJsDoc = extractModuleJsDoc(indexFile)

  // Extract all public exports
  const exports = extractExports(indexFile, project, srcDir, rootDir)

  return {
    description: moduleJsDoc.description,
    examples: moduleJsDoc.examples.length > 0 ? moduleJsDoc.examples : undefined,
    remarks: moduleJsDoc.remarks,
    e2e: moduleJsDoc.e2e,
    exports,
  }
}

// ============================================================================
// Module-level JSDoc extraction
// ============================================================================

interface ModuleJsDoc {
  description?: string
  examples: string[]
  remarks?: string
  e2e?: string
}

/**
 * Extract the module-level JSDoc comment (the one with @module tag).
 */
function extractModuleJsDoc(sourceFile: SourceFile): ModuleJsDoc {
  const result: ModuleJsDoc = { examples: [] }

  // Look for JSDoc comments at the top of the file
  // Module-level JSDoc is typically the first statement's leading JSDoc or a standalone comment
  const firstStatement = sourceFile.getStatements()[0]
  if (!firstStatement) return result

  // Check leading comment ranges on the first statement
  const leadingCommentRanges = firstStatement.getLeadingCommentRanges()

  for (const range of leadingCommentRanges) {
    const text = range.getText()
    if (text.startsWith('/**') && text.includes('@module')) {
      return parseJsDocComment(text)
    }
  }

  // Also check for JSDoc nodes on declarations
  if (Node.isJSDocable(firstStatement)) {
    const jsDocs = firstStatement.getJsDocs()
    for (const jsDoc of jsDocs) {
      if (jsDoc.getTags().some((tag) => tag.getTagName() === 'module')) {
        return parseJsDocFromNode(jsDoc)
      }
    }
  }

  // Fallback: scan all JSDoc comments in the file for @module
  for (const statement of sourceFile.getStatements()) {
    if (Node.isJSDocable(statement)) {
      for (const jsDoc of statement.getJsDocs()) {
        if (jsDoc.getTags().some((tag) => tag.getTagName() === 'module')) {
          return parseJsDocFromNode(jsDoc)
        }
      }
    }
  }

  return result
}

/**
 * Parse a raw JSDoc comment string into structured data.
 */
function parseJsDocComment(comment: string): ModuleJsDoc {
  const result: ModuleJsDoc = { examples: [] }

  // Remove /** and */ and leading * from each line
  const lines = comment
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))

  const content = lines.join('\n').trim()

  // Tag boundaries must ignore lines inside ``` code fences — an @-prefixed
  // line in an example (an Angular @Component decorator, an @import CSS rule)
  // is code, not a JSDoc tag. Truncating there leaves an unclosed fence that
  // corrupts the rest of the generated README.md.
  const contentLines = content.split('\n')
  const tagLineIndexes: { line: number; tag: string }[] = []
  {
    let inFence = false
    contentLines.forEach((rawLine, i) => {
      const trimmed = rawLine.trim()
      if (trimmed.startsWith('```')) {
        inFence = !inFence
        return
      }
      if (!inFence && /^@[a-zA-Z]/.test(trimmed)) {
        tagLineIndexes.push({ line: i, tag: trimmed.split(/[\s({]/)[0] })
      }
    })
  }
  const nextTagLineAfter = (line: number): number =>
    tagLineIndexes.find((t) => t.line > line)?.line ?? contentLines.length

  // Extract description (everything before the first top-level @tag)
  const firstTag = tagLineIndexes[0]
  const descriptionPart = firstTag ? contentLines.slice(0, firstTag.line).join('\n') : content
  const description = descriptionPart.replace(/@module\s*$/, '').trim()
  if (description) {
    result.description = description
  }

  // Extract @example blocks (fence-aware: run until the next top-level tag)
  for (const t of tagLineIndexes) {
    if (t.tag !== '@example') continue
    const sameLineRest = contentLines[t.line].trim().replace(/^@example\s*/, '')
    const body = contentLines.slice(t.line + 1, nextTagLineAfter(t.line)).join('\n')
    const example = (sameLineRest ? sameLineRest + '\n' + body : body).trim()
    if (example) result.examples.push(example)
  }

  // Extract @remarks / @e2e blocks — fence-aware: the tag boundary is the first
  // top-level (outside-fence) @tag line, so an "@remarks"/"@e2e" mention INSIDE an
  // example comment can't hijack the slice. Markdown headings/lists in the body
  // (##, -) are not tag lines, so they stay part of the block.
  const sliceTagBlock = (tagName: string): string | undefined => {
    const t = tagLineIndexes.find((x) => x.tag === tagName)
    if (!t) return undefined
    const sameLineRest = contentLines[t.line].trim().replace(new RegExp(`^${tagName}\\s*`), '')
    const body = contentLines.slice(t.line + 1, nextTagLineAfter(t.line)).join('\n')
    const block = (sameLineRest ? sameLineRest + '\n' + body : body).trim()
    return block || undefined
  }

  const remarks = sliceTagBlock('@remarks')
  if (remarks) result.remarks = remarks

  const e2e = sliceTagBlock('@e2e')
  if (e2e) result.e2e = e2e

  return result
}

/**
 * Parse a JSDoc node from ts-morph into structured data.
 */
function parseJsDocFromNode(jsDoc: JSDoc): ModuleJsDoc {
  const result: ModuleJsDoc = { examples: [] }

  // Get description
  const description = jsDoc.getDescription().trim()
  if (description) {
    result.description = description
  }

  // Get tags
  for (const tag of jsDoc.getTags()) {
    const tagName = tag.getTagName()

    if (tagName === 'example') {
      const text = getTagText(tag)
      if (text) result.examples.push(text)
    }

    if (tagName === 'remarks') {
      const text = getTagText(tag)
      if (text) result.remarks = text
    }

    if (tagName === 'e2e') {
      const text = getTagText(tag)
      if (text) result.e2e = text
    }
  }

  return result
}

// ============================================================================
// Export extraction
// ============================================================================

/**
 * Sort key placing a declaration in SOURCE order: the file it lives in, then its
 * character offset in that file. Two exports from the same file keep the order a
 * reader meets them in while scrolling it; exports from different files group by
 * file instead of interleaving alphabetically.
 *
 * The file is keyed by its path relative to the tree being documented, never by
 * its absolute path. An absolute path made the generated README depend on where
 * the checkout happens to live on disk: the same commit produced a different
 * section order in a `git archive` export than in the live checkout, so the
 * release's docs gate — which generates from the COMMITTED tree and compares the
 * result against the committed README — reported packages as stale that a live
 * run found in sync (release-L54/L55, three `api-resources/*.md`). Layout-free
 * keys make the order a pure function of the source layout.
 *
 * @param declaration - The exported declaration to key.
 * @param rootDir - Root of the tree being documented (see {@link extractPackageApi}).
 * @returns A lexicographic sort key.
 */
function sourceOrderKey(declaration: ExportedDeclarations, rootDir: string): string {
  const file = declaration.getSourceFile().getFilePath()
  const start = String(declaration.getStart()).padStart(12, '0')
  return `${treeRelativePath(file, rootDir)}\u0000${start}`
}

/**
 * A file's path relative to the tree being documented, for a file inside it, and
 * the same shape recovered from the path itself for one outside it.
 *
 * A declaration resolves outside the tree whenever it comes from a dependency's
 * `.d.ts` — and, when generating from a `git archive` export, also from a sibling
 * molecule package reached through a symlink in the live `node_modules`. Those
 * paths still key identically in both trees: an installed module keys from its
 * `node_modules`-relative path, and a sibling package from the root of the tree it
 * lives in. Keying both by their absolute path is what made the export and the
 * live checkout disagree.
 *
 * @param file - Absolute path of the declaration's source file.
 * @param rootDir - Root of the tree being documented.
 * @returns The tree-relative key.
 */
function treeRelativePath(file: string, rootDir: string): string {
  const rel = relative(rootDir, file)
  if (rel && !rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel)) return rel
  const external = externalSourceOf(file)
  if (external) return `node_modules${sep}${external}`
  const ownRoot = packageTreeRoot(file)
  return ownRoot ? relative(ownRoot, file) : file
}

/**
 * The root of the tree a path belongs to — the parent of the `packages/`
 * directory it sits under, or undefined when it sits under none.
 *
 * Found by walking the path's own ancestors rather than by pattern-matching the
 * string, so a directory that merely mentions `packages` higher up is never
 * mistaken for the packages root.
 *
 * @param path - An absolute path inside the tree.
 * @returns The tree root, or undefined.
 */
function packageTreeRoot(path: string): string | undefined {
  let dir = path
  for (;;) {
    const parent = dirname(dir)
    if (parent === dir) return undefined
    if (basename(dir) === 'packages') return parent
    dir = parent
  }
}

/**
 * Extract all public exports from the index file, following re-exports.
 *
 * @param indexFile - The package's `src/index.ts`.
 * @param srcDir - Absolute path of the package's `src/`.
 * @param rootDir - Root of the tree being documented (see {@link sourceOrderKey}).
 */
function extractExports(
  indexFile: SourceFile,
  _project: Project,
  srcDir: string,
  rootDir: string,
): ExtractedExport[] {
  const collected: Array<{ exp: ExtractedExport; order: string }> = []
  const seen = new Set<string>()

  const exportedDeclarations = indexFile.getExportedDeclarations()

  for (const [name, declarations] of exportedDeclarations) {
    if (seen.has(name)) continue
    seen.add(name)

    // Skip type-only exports that are just re-exports of external types
    if (declarations.length === 0) continue

    const declaration = declarations[0]
    const extracted = extractDeclaration(name, declaration, { srcDir, rootDir, depth: 0 })
    if (extracted) {
      collected.push({ exp: extracted, order: sourceOrderKey(declaration, rootDir) })
    }
  }

  // Group by kind (interfaces, then types, then functions, then constants, then
  // enums), and WITHIN a group keep SOURCE order — a package's own file layout
  // is the order a reader expects, and it keeps related exports together.
  const kindOrder: Record<string, number> = {
    interface: 0,
    type: 1,
    class: 2,
    enum: 3,
    function: 4,
    const: 5,
    namespace: 6,
  }

  collected.sort((a, b) => {
    const orderA = kindOrder[a.exp.kind] ?? 99
    const orderB = kindOrder[b.exp.kind] ?? 99
    if (orderA !== orderB) return orderA - orderB
    return a.order < b.order ? -1 : a.order > b.order ? 1 : 0
  })

  return collected.map((c) => c.exp)
}

/**
 * Extract information about a single exported declaration.
 *
 * @param name - The exported name.
 * @param declaration - The declaration node the name resolves to.
 * @param ctx - The package's `src/` (to tell own code from a re-exported third-party
 *   module) and the nesting depth (members are extracted at depth 1 and do not recurse).
 */
function extractDeclaration(
  name: string,
  declaration: ExportedDeclarations,
  ctx: ExtractContext,
): ExtractedExport | null {
  const kind = getDeclarationKind(declaration)
  if (!kind) return null

  const result: ExtractedExport = { name, kind }

  const sourceFile = sourceFileOf(declaration, ctx.srcDir)
  if (sourceFile) result.sourceFile = sourceFile
  else {
    const externalSource = externalSourceOf(declaration.getSourceFile().getFilePath())
    if (externalSource) result.externalSource = externalSource
  }

  // `export * as ns from './file'` — the declaration is the re-exported SourceFile.
  // Capture its members with full detail (signature, declaration, JSDoc,
  // @param/@returns) so the namespaced API is as documented as the top-level one;
  // a one-line name list sends the reader to the .d.ts for everything else.
  //
  // A namespace whose source is NOT this package (zod under `export { z }`) is
  // the exception: its members are another library's public API, hundreds of
  // them, and expanding them buries the package's own docs. Name the module
  // instead — the reader can install and read that one directly.
  if (kind === 'namespace' && Node.isSourceFile(declaration) && ctx.depth === 0) {
    if (!sourceFile) {
      if (result.externalSource) result.externalModule = moduleNameOf(result.externalSource)
    } else {
      const members: ExtractedExport[] = []
      const memberOrder: Array<{ exp: ExtractedExport; order: string }> = []
      const memberSeen = new Set<string>()
      for (const [memberName, memberDecls] of declaration.getExportedDeclarations()) {
        if (memberSeen.has(memberName) || memberDecls.length === 0) continue
        memberSeen.add(memberName)
        const member = extractDeclaration(memberName, memberDecls[0], {
          srcDir: ctx.srcDir,
          rootDir: ctx.rootDir,
          depth: ctx.depth + 1,
        })
        if (!member) continue
        memberOrder.push({ exp: member, order: sourceOrderKey(memberDecls[0], ctx.rootDir) })
      }
      memberOrder.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
      for (const m of memberOrder) members.push(m.exp)
      if (members.length > 0) result.members = members
    }
  }

  // Get JSDoc
  const jsDoc = getDeclarationJsDoc(declaration)
  if (jsDoc) {
    const description = jsDoc.getDescription().trim()
    if (description) result.description = description

    // Check deprecated
    if (jsDoc.getTags().some((tag) => tag.getTagName() === 'deprecated')) {
      result.deprecated = true
    }

    // @param / @returns are read for EVERY kind, not just functions: a class
    // documents its constructor args at class level, and a const holding a
    // callable (a provider factory, a middleware) carries the same tags.
    const paramTags = jsDoc.getTags().filter((tag) => tag.getTagName() === 'param')
    if (paramTags.length > 0) {
      result.params = paramTags
        .map((tag) => extractParamFromTag(tag))
        .filter(Boolean) as ExtractedParam[]
    }

    // Get @returns description text (separate from the actual TS return type)
    const returnTag = jsDoc.getTags().find((tag) => tag.getTagName() === 'returns')
    if (returnTag) {
      result.returnDescription = unwrapJsdocProse(getTagText(returnTag))
    }
  }

  // Extract type signature
  result.signature = getSignature(name, kind, declaration)

  // Extract full declaration text for code blocks
  result.declaration = extractDeclarationText(name, kind, declaration)

  // For functions without JSDoc params, extract from the declaration itself
  if (kind === 'function' && !result.params) {
    result.params = extractParamsFromDeclaration(declaration)
  }

  // For functions, always extract the actual return type from the declaration
  if (kind === 'function') {
    result.returnType = extractReturnType(declaration)
  }

  return result
}

/**
 * The file declaring an export, relative to the package's own `src/` directory
 * (e.g. `authorization.ts`). Undefined when the declaration lives anywhere else —
 * a package's dependency, or the TypeScript lib — which is how a third-party
 * re-export is told apart from the package's own API.
 *
 * @param declaration - The declaration node.
 * @param srcDir - Absolute path of the package's `src/`.
 * @returns The `src/`-relative path, or undefined when the declaration is not the package's own.
 */
function sourceFileOf(declaration: ExportedDeclarations, srcDir: string): string | undefined {
  const filePath = declaration.getSourceFile().getFilePath()
  const prefix = srcDir.endsWith(sep) ? srcDir : srcDir + sep
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : undefined
}

/**
 * The path of a declaration's file BELOW `node_modules` — `zod/v4/classic/external.d.ts`
 * for `…/node_modules/zod/v4/classic/external.d.ts`.
 *
 * A truncated README block names this path so the reader can open the file the
 * documentation was cut from. Without it the pointer degrades to a directory,
 * which is exactly the "go grep the .d.ts yourself" step the README exists to
 * remove.
 *
 * @param filePath - Absolute path of the declaration's source file.
 * @returns The node_modules-relative path, or undefined when the file is not under one.
 */
function externalSourceOf(filePath: string): string | undefined {
  const marker = `${sep}node_modules${sep}`
  // Last occurrence wins: a dependency's own nested node_modules is the closest owner.
  const idx = filePath.lastIndexOf(marker)
  if (idx < 0) return undefined
  return filePath.slice(idx + marker.length) || undefined
}

/**
 * The package name of a module living under `node_modules` — `zod` for
 * `zod/v4/classic/external.d.ts`, `@playwright/test` for a scoped one.
 *
 * @param externalSource - A path below `node_modules` (see {@link externalSourceOf}).
 * @returns The module name.
 */
function moduleNameOf(externalSource: string): string {
  const segments = externalSource.split(sep)
  if (segments[0]?.startsWith('@') && segments.length > 1) {
    return `${segments[0]}/${segments[1]}`
  }
  return segments[0] ?? externalSource
}

/**
 * Determine the kind of an exported declaration.
 */
function getDeclarationKind(declaration: ExportedDeclarations): ExtractedExport['kind'] | null {
  if (Node.isFunctionDeclaration(declaration)) return 'function'
  if (Node.isInterfaceDeclaration(declaration)) return 'interface'
  if (Node.isTypeAliasDeclaration(declaration)) return 'type'
  if (Node.isEnumDeclaration(declaration)) return 'enum'
  if (Node.isClassDeclaration(declaration)) return 'class'
  if (Node.isModuleDeclaration(declaration)) return 'namespace'

  if (Node.isVariableDeclaration(declaration)) {
    // Check if it's an arrow function or function expression
    const initializer = declaration.getInitializer()
    if (initializer) {
      if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
        return 'function'
      }
    }
    return 'const'
  }

  // Source files (from `export * as ns from './file'`) are namespaces
  if (Node.isSourceFile(declaration)) return 'namespace'

  return 'const'
}

/**
 * Get the JSDoc node for a declaration, if any.
 */
function getDeclarationJsDoc(declaration: ExportedDeclarations): JSDoc | null {
  // Variable declarations: JSDoc is on the VariableStatement parent
  if (Node.isVariableDeclaration(declaration)) {
    const statement = declaration.getParent()?.getParent()
    if (statement && Node.isJSDocable(statement)) {
      const jsDocs = statement.getJsDocs()
      return jsDocs.length > 0 ? jsDocs[jsDocs.length - 1] : null
    }
    return null
  }

  if (Node.isJSDocable(declaration)) {
    const jsDocs = declaration.getJsDocs()
    return jsDocs.length > 0 ? jsDocs[jsDocs.length - 1] : null
  }

  return null
}

/**
 * Generate a concise type signature for a declaration.
 */
function getSignature(
  name: string,
  kind: ExtractedExport['kind'],
  declaration: ExportedDeclarations,
): string | undefined {
  switch (kind) {
    case 'function': {
      if (Node.isFunctionDeclaration(declaration)) {
        const params = declaration.getParameters().map((p) => {
          const paramName = p.getName()
          const paramType = p.getType().getText(p)
          const optional = p.isOptional() ? '?' : ''
          return `${paramName}${optional}: ${paramType}`
        })
        const returnType = declaration.getReturnType().getText(declaration)
        return `(${params.join(', ')}) => ${simplifyType(returnType)}`
      }
      if (Node.isVariableDeclaration(declaration)) {
        const init = declaration.getInitializer()
        if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
          const params = init.getParameters().map((p) => {
            const paramName = p.getName()
            const paramType = p.getType().getText(p)
            const optional = p.isOptional() ? '?' : ''
            return `${paramName}${optional}: ${paramType}`
          })
          const returnType = init.getReturnType().getText(init)
          return `(${params.join(', ')}) => ${simplifyType(returnType)}`
        }
      }
      return undefined
    }

    case 'interface': {
      if (Node.isInterfaceDeclaration(declaration)) {
        const typeParams = declaration.getTypeParameters()
        const typeParamsStr =
          typeParams.length > 0 ? `<${typeParams.map((tp) => tp.getText()).join(', ')}>` : ''
        return `interface ${name}${typeParamsStr}`
      }
      return undefined
    }

    case 'type': {
      if (Node.isTypeAliasDeclaration(declaration)) {
        const typeParams = declaration.getTypeParameters()
        const typeParamsStr =
          typeParams.length > 0 ? `<${typeParams.map((tp) => tp.getText()).join(', ')}>` : ''
        return `type ${name}${typeParamsStr}`
      }
      return undefined
    }

    case 'enum': {
      if (Node.isEnumDeclaration(declaration)) {
        const members = declaration.getMembers().map((m) => m.getName())
        if (members.length <= 5) {
          return `enum ${name} { ${members.join(', ')} }`
        }
        return `enum ${name} { ${members.slice(0, 5).join(', ')}, ... }`
      }
      return undefined
    }

    case 'class': {
      if (Node.isClassDeclaration(declaration)) {
        const typeParams = declaration.getTypeParameters()
        const typeParamsStr =
          typeParams.length > 0 ? `<${typeParams.map((tp) => tp.getText()).join(', ')}>` : ''
        const ext = declaration.getExtends()
        const impls = declaration.getImplements()
        let heritage = ''
        if (ext) heritage += ` extends ${simplifyType(ext.getExpression().getText())}`
        if (impls.length > 0) {
          heritage += ` implements ${impls.map((i) => simplifyType(i.getText())).join(', ')}`
        }
        return `class ${name}${typeParamsStr}${heritage}`
      }
      return undefined
    }

    case 'const': {
      if (Node.isVariableDeclaration(declaration)) {
        const type = declaration.getType().getText(declaration)
        return simplifyType(type)
      }
      return undefined
    }

    default:
      return undefined
  }
}

// ============================================================================
// Full declaration text extraction
// ============================================================================

/**
 * Extract the full TypeScript declaration text for rendering in code blocks.
 * For interfaces, types, enums, and classes: uses the raw source text (preserves
 * member JSDoc — a class's methods and their docs are the class's API).
 * For functions: builds a clean function declaration from the AST.
 * For constants: builds a const declaration from the resolved type.
 */
function extractDeclarationText(
  name: string,
  kind: ExtractedExport['kind'],
  declaration: ExportedDeclarations,
): string | undefined {
  // For interfaces, types, enums, and classes: extract raw source text
  if (
    Node.isInterfaceDeclaration(declaration) ||
    Node.isTypeAliasDeclaration(declaration) ||
    Node.isEnumDeclaration(declaration) ||
    Node.isClassDeclaration(declaration)
  ) {
    return extractSourceText(declaration)
  }

  // For functions: build a clean function declaration
  if (kind === 'function') {
    return buildFunctionDeclaration(name, declaration)
  }

  // For constants: build const name: type
  if (kind === 'const' && Node.isVariableDeclaration(declaration)) {
    const type = simplifyType(declaration.getType().getText(declaration))
    return `const ${name}: ${type}`
  }

  return undefined
}

/**
 * Extract the raw source text of a declaration, stripping the leading JSDoc
 * and export keyword. Preserves inner JSDoc on members.
 */
function extractSourceText(declaration: ExportedDeclarations): string {
  const sourceFile = declaration.getSourceFile()
  const fullText = sourceFile.getFullText()
  // Use getStart(false) to skip leading trivia (section comments, JSDoc)
  // but getEnd() to include the full declaration body with inner member JSDoc
  const start = declaration.getStart(false)
  const end = declaration.getEnd()
  let text = fullText.slice(start, end).trim()

  // Strip export keyword
  text = text.replace(/^export\s+(default\s+)?/, '')

  // Clean import() paths that may appear in type annotations
  text = text.replace(/import\([^)]+\)\./g, '')

  return text
}

/**
 * Build a clean function declaration string from the AST.
 * Produces: function name(param?: Type): ReturnType
 */
function buildFunctionDeclaration(name: string, declaration: ExportedDeclarations): string {
  let params: Array<{
    getName(): string
    getType(): { getText(node?: unknown): string }
    isOptional(): boolean
  }> = []
  let returnType = 'void'

  if (Node.isFunctionDeclaration(declaration)) {
    params = declaration.getParameters()
    returnType = simplifyType(declaration.getReturnType().getText(declaration))
  } else if (Node.isVariableDeclaration(declaration)) {
    const init = declaration.getInitializer()
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      params = init.getParameters()
      returnType = simplifyType(init.getReturnType().getText(init))
    }
  }

  const paramStrs = params.map((p) => {
    const pName = p.getName()
    let pType = simplifyType(p.getType().getText(p))
    const optional = p.isOptional()
    // Strip | undefined when the param is already marked optional
    if (optional) {
      pType = pType.replace(/\s*\|\s*undefined$/, '')
    }
    return `${pName}${optional ? '?' : ''}: ${pType}`
  })

  return `function ${name}(${paramStrs.join(', ')}): ${returnType}`
}

// ============================================================================
// Parameter extraction
// ============================================================================

/**
 * Unwraps JSDoc continuation lines in PROSE tag text: ts-morph's
 * `tag.getText()` returns the raw comment lines, so a wrapped description
 * arrives as `first line\n *   second line`. Prose tags (`@param`,
 * `@returns`) read as one paragraph — join the continuation onto the line
 * with a single space. Previously the `@param` regex captured only the
 * first line (continuation silently DROPPED) and `@returns` rendered the
 * raw ` *   ` prefix into README.md. Do NOT use this on `@example` /
 * `@remarks` / `@e2e` — their line structure is load-bearing (code fences,
 * markdown checklists).
 * @param text - The raw tag text (after the `@tag` prefix is removed).
 * @returns The prose joined onto a single line.
 */
function unwrapJsdocProse(text: string): string {
  return text
    .replace(/\n[ \t]*\*[ \t]?/g, ' ')
    .replace(/(\s*\*\s*)+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Extract a parameter from a JSDoc @param tag.
 */
function extractParamFromTag(tag: JSDocTag): ExtractedParam | null {
  const text = unwrapJsdocProse(tag.getText())
  // Match: @param name - description | @param {type} name - description |
  // @param name.member - description. `name` may be a dotted destructured-member
  // path (e.g. `root0.children`), so capture the whole `[\w.$]+` run — a bare
  // `\w+` would stop at the dot and leak `.children - …` into the description.
  const match = text.match(/@param\s+(?:\{([^}]+)\}\s+)?([\w.$]+)\s*-?\s*(.*)/)
  if (!match) return null

  // eslint's `jsdoc/require-param` names an inline-destructured param
  // (`({ a, b }: Props)`) `root0` and its members `root0.a` / `root0.b`; older
  // TS/ts-morph surfaces `__0` or `__namedParameters`. Normalize that
  // machine placeholder to a readable `props` so generated README.md never
  // leaks `root0` — the finding's docs-generator fix (resolve destructured
  // props via the type annotation) instead of N hand-authored exports.
  const name = match[2].replace(/^(?:root\d+|__\d+|__namedParameters)\b/, 'props')

  return {
    name,
    type: match[1] || 'unknown',
    description: match[3]?.trim() || undefined,
  }
}

/**
 * Extract parameters directly from a function declaration.
 */
function extractParamsFromDeclaration(
  declaration: ExportedDeclarations,
): ExtractedParam[] | undefined {
  let params: Array<{
    getName(): string
    getType(): { getText(node?: unknown): string }
    isOptional(): boolean
  }> = []

  if (Node.isFunctionDeclaration(declaration)) {
    params = declaration.getParameters()
  } else if (Node.isVariableDeclaration(declaration)) {
    const init = declaration.getInitializer()
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      params = init.getParameters()
    }
  }

  if (params.length === 0) return undefined

  return params.map((p) => {
    // For an inline-destructured param ts-morph returns the binding-pattern text
    // (`{ a, b }`) or a machine placeholder (`__0` / `__namedParameters`).
    // Normalize either to a readable `props` — same reason as extractParamFromTag:
    // generated docs must never leak `{ a, b }` / `root0` / `__0` as a param name.
    const raw = p.getName()
    const name =
      /^[{[]/.test(raw) || /^(?:root\d+|__\d+|__namedParameters)$/.test(raw) ? 'props' : raw
    return {
      name,
      type: simplifyType(p.getType().getText(p)),
      optional: p.isOptional() || undefined,
    }
  })
}

/**
 * Extract the return type from a function declaration.
 */
function extractReturnType(declaration: ExportedDeclarations): string | undefined {
  if (Node.isFunctionDeclaration(declaration)) {
    return simplifyType(declaration.getReturnType().getText(declaration))
  }
  if (Node.isVariableDeclaration(declaration)) {
    const init = declaration.getInitializer()
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      return simplifyType(init.getReturnType().getText(init))
    }
  }
  return undefined
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the text content of a JSDoc tag (everything after the tag name).
 * Strips trailing JSDoc comment markers (bare `*` lines) that ts-morph
 * may include when the tag is followed by blank comment lines or other tags.
 */
function getTagText(tag: JSDocTag): string {
  const fullText = tag.getText()
  const tagName = tag.getTagName()
  // Remove the @tagName prefix and trim
  let afterTag = fullText.slice(fullText.indexOf(`@${tagName}`) + tagName.length + 1).trim()
  // Strip trailing JSDoc artifacts: lines that are just `*` or whitespace
  afterTag = afterTag.replace(/(\s*\*\s*)+$/, '').trim()
  return afterTag
}

/**
 * Simplify verbose TypeScript types by stripping import() paths.
 */
function simplifyType(type: string): string {
  return type.replace(/import\([^)]+\)\./g, '')
}

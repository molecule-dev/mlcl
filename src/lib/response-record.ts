/**
 * The record a resource's API returns, read from the package's own declared interface.
 *
 * A resource package declares what its service returns (`Article`) apart from what it stores
 * (`ArticleRow`): tags arrive decoded, counts are added, a per-viewer flag is set. An app that
 * is typed from the stored row is typed wrong, so the registry carries the declared record and
 * the app module is typed from that. A published package ships only `dist/`, which is why the
 * registry has to hold it, as it holds routes and tables.
 *
 * @module
 */

import { ts } from 'ts-morph'

/** One field of a declared record, with a type that stands on its own. */
export interface ResponseRecordField {
  name: string
  /** A TypeScript type that names nothing outside itself, e.g. `string[]` or `'open' | 'paid'`. */
  type: string
  optional: boolean
}

/** A package's declared record: the interface name and its fields in source order. */
export interface ResponseRecord {
  name: string
  fields: ResponseRecordField[]
}

const KEYWORDS = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.StringKeyword, 'string'],
  [ts.SyntaxKind.NumberKeyword, 'number'],
  [ts.SyntaxKind.BooleanKeyword, 'boolean'],
  [ts.SyntaxKind.UnknownKeyword, 'unknown'],
  [ts.SyntaxKind.UndefinedKeyword, 'undefined'],
  [ts.SyntaxKind.NullKeyword, 'null'],
])

/**
 * Read one exported interface out of a types module as a self-contained record.
 *
 * A field whose type names another declaration is inlined when that declaration is in the same
 * module and is itself self-contained (a union of literals, an interface of plain fields); a
 * type from elsewhere, a generic, a function or anything recursive becomes `unknown`, which is
 * true of every value and cannot contradict the API.
 *
 * @param source - The text of the package's `src/types.ts`.
 * @param names - The interface names to look for, most specific first.
 * @returns The first interface found, or null when none is exported under those names or the
 *   interface extends another type (its fields are then not all in view).
 */
export function scanResponseRecord(
  source: string,
  names: readonly string[],
): ResponseRecord | null {
  const file = ts.createSourceFile('types.ts', source, ts.ScriptTarget.Latest, true)
  const interfaces = new Map<string, ts.InterfaceDeclaration>()
  const aliases = new Map<string, ts.TypeAliasDeclaration>()
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) interfaces.set(statement.name.text, statement)
    if (ts.isTypeAliasDeclaration(statement)) aliases.set(statement.name.text, statement)
  }
  const exported = (node: ts.InterfaceDeclaration): boolean =>
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)

  const members = (list: ts.NodeArray<ts.TypeElement>, seen: Set<string>): string | null => {
    const parts: string[] = []
    for (const member of list) {
      if (!ts.isPropertySignature(member) || !member.type) return null
      if (!ts.isIdentifier(member.name) && !ts.isStringLiteral(member.name)) return null
      const name = ts.isIdentifier(member.name)
        ? member.name.text
        : JSON.stringify(member.name.text)
      parts.push(`${name}${member.questionToken ? '?' : ''}: ${render(member.type, seen)}`)
    }
    return parts.length > 0 ? `{ ${parts.join('; ')} }` : null
  }

  const render = (node: ts.TypeNode, seen: Set<string>): string => {
    const keyword = KEYWORDS.get(node.kind)
    if (keyword) return keyword
    if (ts.isLiteralTypeNode(node)) return node.getText(file)
    if (ts.isParenthesizedTypeNode(node)) return render(node.type, seen)
    if (ts.isArrayTypeNode(node)) {
      const element = render(node.elementType, seen)
      return /[|&]| =>/.test(element) ? `(${element})[]` : `${element}[]`
    }
    if (ts.isUnionTypeNode(node))
      return [...new Set(node.types.map((part) => render(part, seen)))].join(' | ')
    if (ts.isTypeLiteralNode(node)) return members(node.members, seen) ?? 'unknown'
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const name = node.typeName.text
      const args = node.typeArguments ?? []
      if (name === 'Array' && args.length === 1) {
        const element = render(args[0], seen)
        return /[|&]| =>/.test(element) ? `(${element})[]` : `${element}[]`
      }
      if (name === 'Record' && args.length === 2 && args[0].kind === ts.SyntaxKind.StringKeyword)
        return `Record<string, ${render(args[1], seen)}>`
      // A Date crosses the API as its ISO string.
      if (name === 'Date' && args.length === 0) return 'string'
      if (args.length > 0 || seen.has(name)) return 'unknown'
      const next = new Set(seen).add(name)
      const alias = aliases.get(name)
      if (alias && !alias.typeParameters) return render(alias.type, next)
      const declared = interfaces.get(name)
      if (declared && !declared.typeParameters && !declared.heritageClauses)
        return members(declared.members, next) ?? 'unknown'
    }
    return 'unknown'
  }

  for (const name of names) {
    const declared = interfaces.get(name)
    if (!declared || !exported(declared)) continue
    if (declared.typeParameters || declared.heritageClauses) return null
    const fields: ResponseRecordField[] = []
    for (const member of declared.members) {
      if (!ts.isPropertySignature(member) || !member.type || !ts.isIdentifier(member.name)) continue
      fields.push({
        name: member.name.text,
        type: render(member.type, new Set([name])),
        optional: !!member.questionToken,
      })
    }
    return fields.length > 0 ? { name, fields } : null
  }
  return null
}

/**
 * An accessible name does not draw a click target. Reject statically empty native
 * interactive JSX without content or a visual styling source. Use the framework
 * Icon (a sized SVG), text, or CSS actually imported by the app instead.
 *
 * This is a source check, not a CSS layout engine: dynamic children/classes/styles,
 * spread props and custom components are left to browser tests. Remote stylesheets
 * cannot certify a literal class locally; a narrow, reasoned ESLint disable can
 * document runtime styling that has been verified in the browser.
 * Native control boxes, SVG graphics and presentational dismissal backdrops are
 * outside this check; their dimensions/content are supplied by the browser or
 * drawing attributes instead of an HTML inline element's text content.
 * Local CSS is reached through this module and the nearest workspace's index.html,
 * including module imports, HTML style/link elements and CSS @imports. A matching
 * visual declaration is evidence of styling, not proof of its computed visibility.
 * No project scan, network request or browser is run for ordinary contentful JSX.
 *
 * Canonical: scripts/eslint-rules/no-empty-interactive-target.mjs; synced to mlcl.
 * @module
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join, parse, resolve } from 'node:path'

const ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'scrollbar',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
])
const REPLACED = new Set([
  'button',
  'summary',
  'input',
  'select',
  'textarea',
  'img',
  'svg',
  'rect',
  'ellipse',
  'circle',
  'line',
  'path',
  'polygon',
  'polyline',
  'use',
  'image',
  'canvas',
  'video',
  'audio',
  'iframe',
  'object',
  'embed',
  'hr',
])
const EVENTS =
  /^(?:onClick|onDoubleClick|onPointerDown|onPointerUp|onMouseDown|onMouseUp|onKeyDown|onKeyUp)$/
const STYLE =
  /(?:^|;)\s*(?:content|background(?:-[\w-]+)?|mask(?:-image)?|(?:min-|max-)?(?:width|height|inline-size|block-size)|padding(?:-[\w-]+)?|border(?:-[\w-]+)?)\s*:\s*(?!\s*(?:none|normal|auto|0(?:px|em|rem|%)?|["']{2})\s*(?:;|$))[^;]+/i

function attribute(node, name) {
  return node.openingElement.attributes.find(
    (attr) => attr.type === 'JSXAttribute' && attr.name.name === name,
  )
}

function literal(node) {
  if (node?.type === 'JSXExpressionContainer') return literal(node.expression)
  if (node?.type === 'Literal') return { known: true, value: node.value }
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return { known: true, value: node.quasis[0].value.cooked }
  return { known: false }
}

function tag(node) {
  const name = node.openingElement.name
  return name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name) && !name.name.includes('-')
    ? name.name
    : null
}

function hidden(node) {
  const attr = attribute(node, 'hidden')
  return attr && (!attr.value || literal(attr.value).value === true)
}

function interactive(node) {
  const name = tag(node)
  const role = literal(attribute(node, 'role')?.value).value
  // Pointer-only dismissal backdrops are presentation, not independently exposed controls.
  if (
    role === 'presentation' ||
    role === 'none' ||
    literal(attribute(node, 'aria-hidden')?.value).value === 'true' ||
    literal(attribute(node, 'aria-hidden')?.value).value === true
  )
    return false
  return (
    name === 'button' ||
    name === 'summary' ||
    (name === 'a' && attribute(node, 'href')) ||
    ROLES.has(role) ||
    node.openingElement.attributes.some(
      (attr) =>
        attr.type === 'JSXAttribute' &&
        EVENTS.test(attr.name.name) &&
        (!literal(attr.value).known || !!literal(attr.value).value),
    )
  )
}

/** False only when the expression is statically known to render nothing. */
function expressionContent(node) {
  if (node.type === 'JSXEmptyExpression') return false
  const value = literal(node)
  if (value.known)
    return (
      typeof value.value === 'number' ||
      (typeof value.value === 'string' && value.value.trim() !== '')
    )
  if (node.type === 'ArrayExpression')
    return node.elements.some((item) => item && expressionContent(item))
  return true
}

/** Find the app workspace, without accidentally treating a sibling workspace as its CSS. */
function workspace(filename) {
  let dir = dirname(filename)
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir
    if (dir === parse(dir).root) return dirname(filename)
    dir = dirname(dir)
  }
}

/** Only invoked after a definitely empty interactive subtree is found. */
function loadedStyles(context) {
  const filename = resolve(context.cwd, context.filename)
  const root = workspace(filename)
  const visited = new Set()
  const styles = []
  let unknown = false
  const read = (file) => {
    try {
      return readFileSync(file, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null
      throw error
    }
  }
  const file = (path) => {
    try {
      return statSync(path).isFile()
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false
      throw error
    }
  }
  const locate = (specifier, from, css = false) => {
    const spec = specifier.replace(/[?#].*$/, '')
    if (/^(?:https?:)?\/\//.test(spec)) return null
    if (!spec.startsWith('.') && !spec.startsWith('/')) {
      if (!css && !/\.(?:css|scss|sass|less)$/.test(spec)) return null
      try {
        const require = createRequire(from)
        const found = require.resolve(spec)
        if (extname(found) === '.css') return found
        // CSS @import uses a package's style entry rather than its JS entry.
        const manifest = JSON.parse(read(require.resolve(`${spec}/package.json`)) ?? '{}')
        return manifest.style
          ? resolve(dirname(require.resolve(`${spec}/package.json`)), manifest.style)
          : null
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND' && error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED')
          throw error
        // Build tools may synthesize package CSS (e.g. a utility-class framework).
        // It cannot prove that an arbitrary literal class in this source exists.
        return null
      }
    }
    const path = spec.startsWith('/') ? resolve(root, `.${spec}`) : resolve(dirname(from), spec)
    const base = path.replace(/\.[cm]?jsx?$/, '')
    const candidates = [
      path,
      ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'].map((ext) => base + ext),
      ...['.ts', '.tsx', '.js', '.jsx'].map((ext) => join(path, 'index' + ext)),
    ]
    return candidates.find(file) ?? null
  }
  const css = (text, from) => {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, '')
    styles.push(clean)
    for (const match of clean.matchAll(/@import\s+(?:url\(\s*)?(?:["']([^"']+)["']|([^\s;)]+))/g)) {
      const imported = locate(match[1] ?? match[2], from, true)
      if (imported) visit(imported)
    }
  }
  const visit = (path) => {
    if (visited.has(path)) return
    visited.add(path)
    // Data and image imports do not load a stylesheet. Never treat their
    // non-JavaScript syntax as evidence of unknown styling for the whole app.
    if (/\.(?:json|png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|eot)$/i.test(path)) return
    const text = path === filename ? context.sourceCode.text : read(path)
    if (text === null) return
    if (extname(path) === '.css') {
      css(text, path)
      return
    }
    if (/\.(?:scss|sass|less)$/.test(path)) {
      unknown = true
      return
    }
    let tree
    try {
      tree =
        path === filename
          ? context.sourceCode.ast
          : context.languageOptions.parser.parseForESLint(text, {
              sourceType: 'module',
              ecmaVersion: 'latest',
              ecmaFeatures: { jsx: true },
              filePath: path,
              tsconfigRootDir: root,
            }).ast
    } catch (_error) {
      // Parse/build diagnostics own unsupported syntax; do not guess its CSS.
      unknown = true
      return
    }
    for (const statement of tree.body) {
      if (
        !['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(
          statement.type,
        ) ||
        statement.importKind === 'type' ||
        statement.exportKind === 'type'
      )
        continue
      const spec = statement.source?.value
      if (typeof spec !== 'string' || /[?&](?:raw|url)(?:&|$)/.test(spec)) continue
      const imported = locate(spec, path)
      if (imported) visit(imported)
    }
  }
  const html = read(join(root, 'index.html'))?.replace(/<!--[\s\S]*?-->/g, '')
  if (html) {
    for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
      css(match[1], join(root, 'index.html'))
    for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
      const attrs = new Map(
        [...match[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((item) => [
          item[1].toLowerCase(),
          item[2] ?? item[3],
        ]),
      )
      const sheet =
        match[1].toLowerCase() === 'link' && attrs.get('rel')?.split(/\s+/).includes('stylesheet')
      if (!sheet && !(match[1].toLowerCase() === 'script' && attrs.get('type') === 'module'))
        continue
      const spec = attrs.get(sheet ? 'href' : 'src')
      if (!spec) continue
      const imported = locate(
        spec.startsWith('/') || spec.startsWith('.') || spec.includes('://') ? spec : './' + spec,
        join(root, 'index.html'),
        sheet,
      )
      if (imported) visit(imported)
    }
  }
  visit(filename)
  return { styles, unknown }
}

/** Conservative evidence that a selector explicitly styles this otherwise empty element. */
function styled(node, sheets) {
  if (sheets.unknown) return true
  const name = tag(node)
  const value = literal(attribute(node, 'className')?.value).value
  const classes = (typeof value === 'string' ? value : '').split(/\s+/).filter(Boolean)
  const id = literal(attribute(node, 'id')?.value).value
  for (const css of sheets.styles) {
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!STYLE.test(match[2]) && !/@apply\b/.test(match[2])) continue
      const selector = match[1]
      const tokens = selector.match(/[.#]?[\w-]+/g) ?? []
      const styledAttribute = [
        ...selector.matchAll(/\[\s*([\w-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/g),
      ].some((item) => {
        const attr = attribute(node, item[1] === 'class' ? 'className' : item[1])
        if (!attr) return false
        const expected = item[2] ?? item[3] ?? item[4]
        const actual = literal(attr.value)
        return expected === undefined || !actual.known || String(actual.value) === expected
      })
      if (
        classes.some((cls) => tokens.includes('.' + cls)) ||
        (id && tokens.includes('#' + id)) ||
        tokens.includes(name) ||
        styledAttribute
      )
        return true
    }
  }
  return false
}

export default {
  meta: {
    type: 'problem',
    schema: [],
    docs: {
      description:
        'Interactive JSX needs visible content or a locally verifiable authored visual style.',
    },
    messages: {
      empty:
        'This interactive element has no visible content or locally verifiable visual style. An aria-label, title, role or tabIndex does not draw it. Add visible text or a sized SVG (for example the framework Icon), or import CSS that draws and sizes this element. For remote/runtime CSS, verify it in the browser and use a narrow, reasoned ESLint disable.',
    },
  },
  create(context) {
    let sheets
    const possibleVisual = (node, withStyles) => {
      if (node.type === 'JSXText') return node.value.trim() !== ''
      if (node.type === 'JSXExpressionContainer') return expressionContent(node.expression)
      if (node.type === 'JSXFragment')
        return node.children.some((child) => possibleVisual(child, withStyles))
      if (node.type !== 'JSXElement') return true
      const name = tag(node)
      if (!name || REPLACED.has(name)) return true
      if (hidden(node)) return false
      if (node.openingElement.attributes.some((attr) => attr.type === 'JSXSpreadAttribute'))
        return true
      if (attribute(node, 'dangerouslySetInnerHTML')) return true
      const children = attribute(node, 'children')
      if (children?.value) {
        const content =
          children.value.type === 'JSXExpressionContainer'
            ? children.value.expression
            : children.value
        if (expressionContent(content)) return true
      }
      const className = attribute(node, 'className')
      if (className?.value && !literal(className.value).known) return true
      const style = attribute(node, 'style')?.value
      if (style) {
        if (style.type !== 'JSXExpressionContainer' || style.expression.type !== 'ObjectExpression')
          return true
        const props = style.expression.properties
        if (
          props.some(
            (prop) => prop.type === 'SpreadElement' || prop.computed || !literal(prop.value).known,
          )
        )
          return true
        const css = props
          .map(
            (prop) =>
              `${String(prop.key.name ?? prop.key.value).replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}:${literal(prop.value).value}`,
          )
          .join(';')
        if (STYLE.test(css)) return true
      }
      if (node.children.some((child) => possibleVisual(child, withStyles))) return true
      return withStyles && styled(node, (sheets ??= loadedStyles(context)))
    }
    return {
      JSXElement(node) {
        if (!tag(node) || REPLACED.has(tag(node)) || hidden(node) || !interactive(node)) return
        // Contentful projects incur no filesystem traversal from this rule.
        if (!possibleVisual(node, false) && !possibleVisual(node, true))
          context.report({ node: node.openingElement, messageId: 'empty' })
      },
    }
  },
}

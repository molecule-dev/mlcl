import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import prettier from 'prettier'

/**
 * Returns the name of some node.
 */
const getName = (source, node) => {
  const name = (node.name && node.name.escapedText)
    || (node.parameters && source.substring(node.parameters.pos, node.parameters.end))

  // Change type [key: string] to {...} so it will be parsed by JSDoc.
  if (name === 'key: string') {
    return '{...}'
  }

  return name
}

/**
 * Returns the name of some type.
 */
const getTypeName = (source, type) => {
  let typeName = ``

  if (!type) {
    return `any`
  }

  if (type.typeName && type.typeName.escapedText) {
    typeName = type.typeName.escapedText

    if (type.typeArguments && type.typeArguments.length) {
      const args = type.typeArguments.map(subType => getTypeName(source, subType)).join(', ')
      typeName = `${typeName}<${args}>`
    }
  } else if (ts.isFunctionTypeNode(type) || ts.isFunctionLike(type)) {
    typeName = 'function'
  } else if (ts.isArrayTypeNode(type)) {
    typeName = 'Array'
  } else if (type.types) {
    typeName = type.types.map(subType => getTypeName(source, subType)).join(' | ')
  } else if (type.members && type.members.length) {
    typeName = 'object'
  } else {
    typeName = source.substring(type.pos, type.end).trim()
  }

  typeName = typeName.replace(/`/g, `'`)
  typeName = typeName.replace(`['`, `#`).replace(`']`, ``)
  typeName = typeName.replace(/keyof .+/g, `string`)
  typeName = typeName.replace(/<.+>/gi, ``)
  typeName = typeName.replace(/typeof /gi, ``)

  return typeName
}

/**
 * Returns the JSDoc `@param` tag for some parameter.
 */
const getJSDocParamTag = (source, parameter) => {
  let parameterName = getName(source, parameter)
  const parameterComment = (parameter.jsDoc && parameter.jsDoc[0] && parameter.jsDoc[0].comment) || ''

  if (parameter.questionToken) {
    parameterName = ['[', parameterName, ']'].join('')
  }

  return `@param {${getTypeName(source, parameter.type)}} ${parameterName}${parameterComment ? ` ${parameterComment}` : ``}`
}

/**
 * Returns JSDoc `@property` tags for some type.
 */
const getJSDocPropertyTags = (source, type, tags: string[] = [], parentName = '') => {
  // Type could be an array of types like: `{sth: 1} | string` so parse each type separately.
  const typesToCheck = [type]

  if (type.types && type.types.length) {
    typesToCheck.push(...type.types)
  }

  typesToCheck.forEach(type => {
    // Handling array defined like this: {element1: 'something'}[]
    if (ts.isArrayTypeNode(type) && type.elementType) {
      getJSDocPropertyTags(source, type.elementType, tags, parentName ? parentName + '[]' : '[]')
    }

    // Handling Array<{element1: 'somethin'}>
    if (type.typeName && type.typeName.escapedText === 'Array') {
      if (type.typeArguments && type.typeArguments.length) {
        type.typeArguments.forEach(subType => {
          getJSDocPropertyTags(source, subType, tags, parentName ? parentName + '[]' : '')
        })
      }
    }

    // Handling {property1: "value"}
    (type.members || []).filter(m => ts.isTypeElement(m)).forEach(member => {
      let memberName = getName(source, member)
      const memberComment = (member.jsDoc && member.jsDoc[0] && member.jsDoc[0].comment) || ''
      const members = member.type.members || []
      const memberTypeName = members.length ? 'object' : getTypeName(source, member.type)

      if (parentName) {
        memberName = [parentName, memberName].join('.')
      }

      tags.push(`@property {${memberTypeName}} ${member.questionToken ? `[${memberName}]` : memberName}${memberComment ?  ` ${memberComment}` : ``}`)
      getJSDocPropertyTags(source, member.type, tags, memberName)
    })
  })

  return tags
}

/**
 * Returns JSDoc comment lines and a method to append comment lines.
 */
const useCommentLines = (source, jsDocNode) => {
  const commentLines = jsDocNode
    ? source.substring(jsDocNode.pos, jsDocNode.end).split(/(\n|\r|\r\n)/).filter(line => line.trim().length > 0)
    : [`/**`, ` */`]

  let appendedAtLeastOnce = jsDocNode ? false : true
  const shouldUpdate = { current: false }

  const appendComment = line => {
    let args: (number | string)[] = [commentLines.length - 1, 0]

    if (!appendedAtLeastOnce) {
      appendedAtLeastOnce = true
      args = args.concat(` *`)
    }

    args = args.concat([].concat(line).map(line => ` * ${line}`))
    // eslint-disable-next-line prefer-spread
    commentLines.splice.apply(commentLines, args)
    shouldUpdate.current = true
  }

  return [ commentLines, appendComment, shouldUpdate ]
}

/**
 * Updates JSDoc comments based on the type definitions.
 */
const updateJSDocComments = (source, filename, modulePath) => {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true
  )

  let updatedSource = source
  let tempConstantIndex = 1

  const isTest = modulePath.includes(`/__tests__/`) && !/\.(spec|test)\.tsx?$/.test(filename)

  if (modulePath && !isTest) {
    if (!updatedSource.includes(`* @module`)) {
      updatedSource = `${updatedSource}\n\n/** @module ${modulePath} */`
    }
  }

  for (const _statement of sourceFile.statements) {
    const statement = _statement as ts.Statement & { jsDoc: ts.JSDocComment; declarationList: ts.VariableDeclarationList } // TODO fix this
    const name = getName(source, statement)
    const [ commentLines, appendComment, shouldUpdate ] = useCommentLines(source, statement.jsDoc && statement.jsDoc[0])

    const appendMemberOf = () => {
      if (modulePath && !isTest) {
        appendComment([
          `@memberof module:${modulePath}`,
          ``
        ])
      }
    }

    let addCommentAfter = false

    const declaration = statement.declarationList
      && statement.declarationList.declarations
      && statement.declarationList.declarations[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initializer = declaration && declaration.initializer as ts.VariableDeclaration['initializer'] & { parameters: any }  // TODO
    const functionParameters = initializer && initializer.parameters

    if (ts.isTypeAliasDeclaration(statement)) {
      addCommentAfter = true

      if (ts.isFunctionTypeNode(statement.type)) {
        appendMemberOf()
        appendComment(`@typedef {function} ${name}`)

        statement.type.parameters.forEach(parameter => {
          appendComment(getJSDocParamTag(source, parameter))
        })
      }

      if (ts.isTypeLiteralNode(statement.type)) {
        appendMemberOf()
        appendComment(`@typedef {object} ${name}`)
        getJSDocPropertyTags(source, statement.type).forEach(appendComment)
      }

      if (ts.isIntersectionTypeNode(statement.type)) {
        appendMemberOf()
        appendComment(`@typedef {object} ${name}`)
        getJSDocPropertyTags(source, statement.type).forEach(appendComment)
      }
    } else if (ts.isInterfaceDeclaration(statement)) {
      addCommentAfter = true

      appendMemberOf()
      appendComment(`@typedef ${name}`)

      statement.members.forEach(member => {
        const memberName = getName(source, member)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memberType = (member as any).type // TODO
        appendComment(`@property {${getTypeName(source, memberType)}} ${member.questionToken ? `[${memberName}]` : memberName}`)
      })
    } else if (ts.isClassDeclaration(statement)) {
      const className = getName(source, statement)
      const memberComments: string[] = []

      statement.members.forEach(member => {
        if (!ts.isPropertyDeclaration(member)) {
          return
        }

        const modifiers = (member.modifiers || []).map(m => m.getText({text: source}))

        modifiers.forEach(m => {
          if (['private', 'public', 'protected'].includes(m)) {
            memberComments.push(`@${m}`)
          }
        })

        if (member.type) {
          memberComments.push(`@type {${getTypeName(source, member.type)}}`)
        }

        if (modifiers.find((m => m === 'static'))) {
          memberComments.push(`${className}.${getName(source, member)}`)
        } else {
          memberComments.push(`${className}.prototype.${getName(source, member)}`)
        }

        memberComments.forEach(appendComment)
      })
    } else if (declaration && declaration.type) {
      appendMemberOf()
      appendComment(`@type {${getTypeName(source, declaration.type)}}`)
    } else if (functionParameters) {
      appendMemberOf()
      functionParameters.forEach(parameter => {
        appendComment(getJSDocParamTag(source, parameter))
      })
    }

    if (shouldUpdate.current) {
      const newCommentBlock = commentLines.join(`\n`) // TODO .replace(/```ts/g, '```js')
      const text = statement.getText().trim()
      const fullText = statement.getFullText().trim()

      if (filename.split(/\/|\\/).pop() === `types.ts` || !fullText || updatedSource.indexOf(fullText) < 0) {
        updatedSource = `${updatedSource}\n\n${newCommentBlock}`
      } else if (addCommentAfter) {
        updatedSource = updatedSource.replace(statement.jsDoc ? fullText : text, `${text}\n\n${newCommentBlock}\nconst ___temp${tempConstantIndex++} = null`)
      } else {
        updatedSource = updatedSource.replace(statement.jsDoc ? fullText : text, `${newCommentBlock}\n${text}`)
      }
    }
  }

  return updatedSource
}

/** 
 * Recursively walks through the directories and converts all .ts and .tsx files
 * to .js and .jsx files with JSDoc type annotations based on the type definitions.
 * 
 * All other files are copied as is.
 */
const transpileRecursively = (tsPath: string, jsPath: string, modulePath = '') => {
	const files = fs.readdirSync(tsPath)

  for (const file of files) {
    const tsFile = path.join(tsPath, file)
    const jsFile = path.join(jsPath, file.replace(/\.ts$/, '.js').replace(/\.tsx$/, '.jsx'))
    const stats = fs.statSync(tsFile)

    if (stats.isDirectory()) {
      transpileRecursively(tsFile, jsFile, modulePath ? `${modulePath}/${file}` : file)
      continue
    } else if (!/\.tsx?$/.test(file)) {
      // Ensure the directory exists.
      if (!fs.existsSync(jsPath)) {
        fs.mkdirSync(jsPath, { recursive: true })
      }

      fs.copyFileSync(tsFile, jsFile)
      continue
    } else if (/\.d\.ts$/.test(file)) {
      continue
    }

    let source = fs.readFileSync(tsFile, 'utf8')

    if (source.includes(`/** @ts-only */`)) {
      // Skip copying of files with this flag.
      continue
    }

    // Remove lines (usually type imports) containing the `// @ts-only` comment.
    source = source.replace(/^(.*)\/\/ @ts-only(.*)(\r|\n|\r\n)/gm, ``)

    // Preserve double dollar signs. No idea why these are being reduced to a single one.
    source = source.replace(/\$\$\{/g, '__DOLLAR_SIGN__${')

    // Ensure every module is covered.
    source = source + `\n\n\nconst ___temp = null`

    // Add the necessary JSDoc comments based on the type definitions.
    source = updateJSDocComments(source, tsFile, modulePath ? `${modulePath}/${file.replace(/\.tsx?$/, ``)}` : file.replace(/\.tsx?$/, ``))

    // Preserve line spacing.
    source = source.replace(/(\n\n|\r\r|\r\n\r\n)/g, '\n/* __NEWLINE__ */')

    // Get transpiled ESM code.
    source = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        esModuleInterop: true,
        strict: false,
        jsx: /\.tsx$/.test(file) ? ts.JsxEmit.Preserve : ts.JsxEmit.None,
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
        pretty: true
      }
    }).outputText

    // Restore line spacing.
    source = source.replace(/\/\* __NEWLINE__ \*\//g, '\n')

    // Remove the temporary constants.
    source = source.replace(/const ___temp(|[0-9]+) = null/g, '')

    // Remove @typescript-eslint lines.
    source = source.replace(/(\s|)(\/\/|\/\*) eslint-disable(|-next-line) @typescript-eslint\/.*?(\n|\r|\r\n)/gi, `\n`)

    try {
      // Make the code pretty again.
      source = prettier.format(source, {
        filepath: jsFile,
        printWidth: 120,
        semi: false,
        singleQuote: true,
        quoteProps: 'consistent',
        jsxSingleQuote: true,
        trailingComma: 'none'
      })
    } catch (error) {
      console.error(error)
      console.log(tsFile)
      console.log(source)
    }

    // Restore double dollar signs.
    source = source.replace(/__DOLLAR_SIGN__/g, '$')

    if (source.trim().length && source.trim() !== `export {}`) {
      // Ensure the directory exists.
      if (!fs.existsSync(jsPath)) {
        fs.mkdirSync(jsPath, { recursive: true })
      }

      // Write the JavaScript file.
      fs.writeFileSync(jsFile, source)
    }
  }
}

/**
 * A very quick and dirty hacked together script to convert a TypeScript codebase to JavaScript one.
 */
export const convertTypeScriptToJavaScript = async (cwd = `.`) => {
  const tsPath = path.join(cwd, `src-ts`)
  const jsPath = path.join(cwd, `src`)

  try {
    // Transpile all TypeScript to JavaScript.
    fs.renameSync(jsPath, tsPath)
    fs.mkdirSync(jsPath)
    transpileRecursively(tsPath, jsPath)
    fs.rmSync(tsPath, { recursive: true, force: true })
  } catch (error) {
  }

  try {
    // Remove TypeScript dependencies and replace `.ts` with `.js` in `package.json`.
    const packageJsonPath = path.join(cwd, `package.json`)
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, `utf8`))

    delete packageJson.devDependencies[`ts-node`]
    delete packageJson.devDependencies[`typescript`]
    delete packageJson.devDependencies[`@babel/preset-typescript`]

    for (const moduleName in packageJson.devDependencies) {
      if (/^@(types\/|typescript(\/|-))/.test(moduleName)) {
        delete packageJson.devDependencies[moduleName]
      }
    }

    for (const scriptName in packageJson.scripts) {
      const script = packageJson.scripts[scriptName]

      if (script.includes(` --loader=ts-node/esm`)) {
        packageJson.scripts[scriptName] = script
          .replace(/ --loader=ts-node\/esm/g, ``)
          .replace(/\.tsx\b/g, `.jsx`)
          .replace(/\.ts\b/g, `.js`)
      }
    }

    if (packageJson.scripts.build === `tsc`) {
      delete packageJson.scripts.build
    }

    if (packageJson.scripts.start) {
      packageJson.scripts.start = packageJson.scripts.start.replace(`node build/`, `node src/`)
    }

    await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  } catch (error) {
  }

  try {
    // Remove `tsconfig.json`.
    await fs.promises.rm(path.join(cwd, `tsconfig.json`))
  } catch (error) {
  }

  try {
    // Update `.eslintrc.json`.
    const eslintConfigPath = path.join(cwd, `.eslintrc.json`)
    const eslintConfig = JSON.parse(await fs.promises.readFile(eslintConfigPath, `utf8`))

    if (eslintConfig.plugins) {
      eslintConfig.plugins = eslintConfig.plugins.filter(plugin => plugin !== `@typescript-eslint`)
    }

    delete eslintConfig.parser

    if (eslintConfig.extends) {
      eslintConfig.extends = eslintConfig.extends.filter(extend => extend !== `plugin:@typescript-eslint/recommended`)
    }

    if (eslintConfig.rules) {
      for (const key in eslintConfig.rules) {
        if (/^@typescript-/.test(key)) {
          delete eslintConfig.rules[key]
        }
      }
    }

    await fs.promises.writeFile(eslintConfigPath, JSON.stringify(eslintConfig, null, 2))
  } catch (error) {
  }

  try {
    // Update `jest.config.json` if it exists.
    const jestConfigPath = path.join(cwd, `jest.config.json`)
    await fs.promises.access(jestConfigPath, fs.constants.R_OK | fs.constants.R_OK)
    await fs.promises.writeFile(jestConfigPath, JSON.stringify({
      "roots": [
        "<rootDir>/src/"
      ],
      "setupFiles": [
        "<rootDir>/src/environment.js"
      ],
      "moduleNameMapper": {
        "^(\\.{1,2}/.*)\\.jsx?$": "$1"
      }
    }, null, 2))
  } catch (error) {
  }

  try {
    // Update `babel.config.json` if it exists.
    const babelConfigPath = path.join(cwd, `babel.config.json`)
    const babelConfig = JSON.parse(await fs.promises.readFile(babelConfigPath, `utf8`))
    babelConfig.presets = babelConfig.presets.filter(preset => preset !== `@babel/preset-typescript`)
    await fs.promises.writeFile(babelConfigPath, JSON.stringify(babelConfig, null, 2))
  } catch (error) {
  }

  try {
    // Replace all TypeScript info with JavaScript.
    const readmePath = path.join(cwd, `README.md`)
    let README = await fs.promises.readFile(readmePath, `utf8`)

    README = README
      .replace(`\r\n- [\`ts-node\`](https://www.npmjs.com/package/ts-node) - Allows us to run TypeScript (.ts) files as easily as JavaScript (.js) files.\r\n`, ``)
      .replace(`Uses the [TypeScript](typescriptlang.org) compiler to compile the \`*.ts\` files within the \`src\` directory into \`*.js\` files within the \`build\` directory. You probably don't need to use this unless you're explicitly running the production build locally, as [\`ts-node\`](https://www.npmjs.com/package/ts-node) handles everything for you in development.`, ``)
      .replace(`### \`npm run build\`\r\n\r\n\r\n\r\n\r\n`, ``)
      .replace(`### \`yarn run build\`\r\n\r\n\r\n\r\n\r\n`, ``)
      .replace(`\r\n- \`@types/*\` - Type definitions for popular libraries. See [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) for more information.\r\n`, ``)
      .replace(`\r\n- \`@typescript-eslint/*\` - Enables linting of our TypeScript codebase.\r\n`, ``)
      .replace(`\r\n- [\`typescript\`](https://www.npmjs.com/package/typescript) - Necessary for TypeScript support.\r\n`, ``)
      .replace(/www\.typescriptlang\.org/g, `developer.mozilla.org/en-US/docs/Web/JavaScript`)
      .replace(/JavaScript and TypeScript/g, `JavaScript`)
      .replace(/TypeScript/g, `JavaScript`)
      .replace(/\.ts\b/g, `.js`)

    await fs.promises.writeFile(readmePath, README)
  } catch (error) {
  }
}

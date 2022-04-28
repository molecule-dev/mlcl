import fs from 'fs'
import path from 'path'

/**
 * A very quick and dirty hacked together script to convert TypeDoc usage to JSDoc.
 */
export const convertTypeDocToJSDoc = async (cwd = `.`) => {
  try {
    // Replace `typedoc` with `jsdoc` in `package.json`.
    const packageJsonPath = path.join(cwd, `package.json`)
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, `utf8`))

    delete packageJson.devDependencies.typedoc
    packageJson.devDependencies.jsdoc = `^3.6.10`
    packageJson.scripts.docs = `jsdoc -r -c jsdoc.json && open-cli ./docs/index.html`

    await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  } catch (error) {
  }

  try {
    // Replace `typedoc.json` with `jsdoc.json`.
    await fs.promises.rm(path.join(cwd, `typedoc.json`))
    await fs.promises.writeFile(path.join(cwd, `jsdoc.json`), JSON.stringify({
      "source": {
        "include": "./src",
        "includePattern": "\\.jsx?$",
        "excludePattern": "(/|\\\\)__tests__(/|\\\\)|\\.(spec|test)\\.jsx?$"
      },
      "opts": {
        "destination": "./docs",
        "readme": "./README.md"
      },
      "plugins": [
        "plugins/markdown"
      ]
    }, null, 2))
  } catch (error) {
  }

  try {
    // Replace all TypeDoc info with JSDoc.
    const readmePath = path.join(cwd, `README.md`)
    let README = await fs.promises.readFile(readmePath, `utf8`)

    README = README
      .replace(/typedoc\.org/g, `jsdoc.app`)
      .replace(/TypeDoc\.org/g, `JSDoc.app`)
      .replace(/typedoc/g, `jsdoc`)
      .replace(/TypeDoc/g, `JSDoc`)

    await fs.promises.writeFile(readmePath, README)
  } catch (error) {
  }
}

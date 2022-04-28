import fs from 'fs'
import path from 'path'
import glob from 'glob'

/**
 * A very quick and dirty hacked together script to convert an NPM codebase to a Yarn one.
 */
export const convertNpmToYarn = async (cwd = `.`) => {
  try {
    // Add Yarn to prerequisites in README.
    const readmePath = path.join(cwd, `README.md`)
    let README = await fs.promises.readFile(readmePath, `utf8`)

    README = README.replace(
      `- [Node.js](https://nodejs.org/) (version 16)`,
      `- [Node.js](https://nodejs.org/) (version 16)

  - [Yarn](https://yarnpkg.com/getting-started/install)

  - The recommended way to install Yarn is by enabling [Corepack](https://github.com/nodejs/corepack), which is included by default with the latest Node.js version, but it is opt-in. To enable Corepack, run \`corepack enable\` in your console, which may require elevated permissions (if on Windows, run command prompt as administrator). `
    )

    await fs.promises.writeFile(readmePath, README)
  } catch (error) {
  }

  try {
    // Replace all "npm" descriptions/instructions with "yarn". 
    await new Promise<void>((resolve, reject) => {
      glob(`{*.md,**!(node_modules)/*.md,src/**/*.{js,jsx,ts,tsx}}`, { cwd }, async (error, files) => {
        if (error) {
          reject(error)
          return
        }

        const replace = async (file: string) => {
          const filePath = path.join(cwd, file)
          const npmContents = await fs.promises.readFile(filePath, `utf8`)
          const yarnContents = npmContents
            .replace(/npm run/g, `yarn run`)
            .replace(/npm start/g, `yarn start`)
            .replace(/npm install/g, `yarn install`)
            .replace(/npm version/g, `yarn version`)
            .replace(/npm test/g, `yarn test`)
            .replace(/npx cap/g, `yarn run cap`)

          if (npmContents !== yarnContents) {
            await fs.promises.writeFile(filePath, yarnContents)
          }
        }

        await replace(`package.json`)

        try {
          await fs.promises.access(path.join(cwd, `electron/package.json`), fs.constants.R_OK | fs.constants.W_OK)
          await replace(`electron/package.json`)
        } catch (error) {
        }

        await Promise.all(files.map(file => replace(file)))

        // yarn install
        // git add yarn.lock
        // git add electron/yarn.lock

        resolve()
      })
    })
  } catch (error) {
  }
}

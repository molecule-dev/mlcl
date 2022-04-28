/**
 * This module helps with various sets of environment variables,
 * using both `dotenv` and `env-cmd`.
 * 
 * The `.env` file will be loaded via `dotenv.config()` and extended
 * by the variables for the `NODE_ENV` key specified in `.env-cmdrc.json`.
 * 
 * This also allows you to combine various sets of env vars using e.g.:
 * ```
 * ./node_modules/.bin/env-cmd -e development,something,etc npm run dev
 * ```
 * 
 * @see https://www.npmjs.com/package/dotenv
 * @see https://www.npmjs.com/package/env-cmd
 * 
 * @module
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pkg } from './pkg.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

const defaultEnv = {
  APP_ID: `mlcl`,
  APP_NAME: pkg.name,
  APP_VERSION: pkg.version,
  APP_PLATFORM: `cli`,
  API_ORIGIN: `https://api.molecule.dev`,
  WEB_ORIGIN: `https://assemble.molecule.dev`,
  LOG_LEVEL: `info`,
}

const defaultEnvCmdrc = {
  'development': {
    NODE_ENV: 'development',
    API_ORIGIN: 'http://localhost:4000',
    WEB_ORIGIN: 'http://localhost:3000',
  },
  'production': {
    NODE_ENV: 'production',
    API_ORIGIN: 'https://api.molecule.dev',
    WEB_ORIGIN: 'https://assemble.molecule.dev',
  },
  'test': {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    API_ORIGIN: 'http://localhost:4000',
    WEB_ORIGIN: 'http://localhost:3000',
  }
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = `production`
}

for (const key in defaultEnv) {
  process.env[key] = defaultEnv[key]
}

/**
 * Sets the variables specified within each environment within `.env-cmdrc.json`.
 */
export const setVariables = (environments: string[] = [ process.env.NODE_ENV || `production` ]) => {
  try {
    const envCmdrcPath = path.join(__dirname, '../.env-cmdrc.json')
    const envCmdrc = fs.existsSync(envCmdrcPath)
      ? JSON.parse(fs.readFileSync(envCmdrcPath, 'utf8'))
      : defaultEnvCmdrc

    for (const environment of environments) {
      const variables = envCmdrc[environment]

      if (variables) {
        Object.assign(process.env, variables)
      } else {
        console.warn(`Environment "${environment}" not found within .env-cmdrc.`)
      }
    }
  } catch (error) {
  }
}

// Extend the environment variables using `.env-cmdrc.json`.
setVariables()

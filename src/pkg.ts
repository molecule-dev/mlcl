import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

export const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, `../package.json`), `utf8`)) as {
  name: string
  description: string
  version: string
}

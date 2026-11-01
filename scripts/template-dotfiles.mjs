#!/usr/bin/env node
/**
 * prepack / postpack: npm never packs `.gitignore` or `.npmrc` files, so each
 * flagship's are recorded in a `dotfiles.json` beside it before packing and the
 * manifests removed after (src/lib/template-dotfiles.ts). Runs on the build's
 * dist, which `prepack` has just produced.
 *
 *   node scripts/template-dotfiles.mjs pack | clean
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { shouldSkipDuringCopy } from '../dist/lib/scaffold.js'
import { cleanTemplateDotfiles, packTemplateDotfiles } from '../dist/lib/template-dotfiles.js'

const templates = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates')
const mode = process.argv[2]
if (mode === 'pack') {
  const { templates: count, files } = packTemplateDotfiles(templates, shouldSkipDuringCopy)
  console.log(`template dot files: ${files} recorded across ${count} templates`)
} else if (mode === 'clean') {
  console.log(`template dot-file manifests removed: ${cleanTemplateDotfiles(templates)}`)
} else {
  console.error('usage: node scripts/template-dotfiles.mjs pack|clean')
  process.exit(2)
}

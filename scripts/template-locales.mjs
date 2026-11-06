#!/usr/bin/env node
/** Generate/clean npm locale manifests using the just-built CLI, like dotfiles. */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { shouldSkipDuringCopy } from '../dist/lib/scaffold.js'
import { cleanTemplateLocales, packTemplateLocales } from '../dist/lib/template-locales.js'

const templates = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates')
const mode = process.argv[2]
if (mode === 'pack')
  console.log('template locales:', packTemplateLocales(templates, shouldSkipDuringCopy))
else if (mode === 'clean')
  console.log('template locale manifests removed:', cleanTemplateLocales(templates))
else {
  console.error('usage: node scripts/template-locales.mjs pack|clean')
  process.exitCode = 2
}

#!/usr/bin/env node
/**
 * Pack/clean each flagship's tree manifest (src/lib/template-tree.ts) using the just-built CLI. Runs
 * last in prepack, so the manifests carry the dotfile and locale manifests the earlier steps wrote,
 * and first in postpack. The file list is npm's own (`npm pack --dry-run`), read before the nested
 * .npmignore files that leave the packed trees out exist.
 */
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { singlePackResult } from '../dist/lib/npm-pack-json.js'
import { cleanTemplateTrees, packTemplateTrees } from '../dist/lib/template-tree.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2]
if (mode === 'pack') {
  cleanTemplateTrees(root)
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })
  const shipped = singlePackResult(raw).files.map((file) => file.path)
  console.log('template trees:', packTemplateTrees(root, shipped))
} else if (mode === 'clean')
  console.log('template tree manifests removed:', cleanTemplateTrees(root))
else {
  console.error('usage: node scripts/template-trees.mjs pack|clean')
  process.exitCode = 2
}

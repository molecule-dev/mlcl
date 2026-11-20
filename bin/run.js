#!/usr/bin/env node

import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { execute } from '@oclif/core'

import { staleBuildWarning } from './stale-build.mjs'

const stale = staleBuildWarning(fileURLToPath(new URL('..', import.meta.url)))
if (stale) process.stderr.write(`${stale}\n`)

await execute({ dir: import.meta.url })

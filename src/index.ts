#!/usr/bin/env node

/**
 * Molecule.dev command line tools.
 * 
 * @module
 */

import './environment.js'
import { program } from 'commander'
import * as commands from './commands/index.js'

export * as API from './API/index.js'
export * as commands from './commands/index.js'
export * as utilities from './utilities/index.js'

export * from './logger.js'
export * from './pkg.js'
export * from './repoConfig.js'
export * from './userConfig.js'

export * as types from './types/index.js'

for (const commandKey in commands) {
  if (typeof commands[commandKey] === `function`) {
    commands[commandKey](program)
  }
}

program.parse()

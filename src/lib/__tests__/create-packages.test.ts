/**
 * `readCreatePackages` (create-packages.ts): how `mlcl create --packages` reads its words. A Codex
 * run (2026-11-25) wrote `--packages @molecule/a @molecule/b @molecule/c`, and oclif refused the
 * second and third as unexpected arguments.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { readCreatePackages } from '../create-packages.js'

const known = new Set([
  '@molecule/api-resource-user',
  '@molecule/api-database-sqlite',
  '@molecule/app-auth',
])

describe('readCreatePackages', () => {
  it('reads names separated by commas, spaces or both', () => {
    for (const values of [
      ['@molecule/api-resource-user,@molecule/api-database-sqlite,@molecule/app-auth'],
      ['@molecule/api-resource-user', '@molecule/api-database-sqlite', '@molecule/app-auth'],
      ['@molecule/api-resource-user,@molecule/api-database-sqlite', '@molecule/app-auth'],
      ['@molecule/api-resource-user, @molecule/api-database-sqlite,', '@molecule/app-auth'],
    ])
      expect(readCreatePackages(values, 'shop', known)).toEqual({
        packages: [
          '@molecule/api-resource-user',
          '@molecule/api-database-sqlite',
          '@molecule/app-auth',
        ],
        name: 'shop',
        unknown: [],
      })
  })

  it('takes a name without the @molecule/ scope, and each name once', () => {
    expect(
      readCreatePackages(['api-database-sqlite,app-auth', '@molecule/app-auth'], '.', known),
    ).toEqual({
      packages: ['@molecule/api-database-sqlite', '@molecule/app-auth'],
      name: '.',
      unknown: [],
    })
  })

  it('reads the word after the list as the project name when none came before', () => {
    expect(readCreatePackages(['@molecule/app-auth', 'my-app'], undefined, known)).toEqual({
      packages: ['@molecule/app-auth'],
      name: 'my-app',
      unknown: [],
    })
  })

  it('refuses a word that names no package, counterexamples to the name rule included', () => {
    // A misspelling, a stray word after a project name was given, and a name inside a comma list.
    expect(readCreatePackages(['@molecule/api-database-sqlitex'], 'shop', known).unknown).toEqual([
      '@molecule/api-database-sqlitex',
    ])
    expect(readCreatePackages(['@molecule/app-auth', 'extra'], 'shop', known).unknown).toEqual([
      'extra',
    ])
    expect(readCreatePackages(['@molecule/app-auth,my-app'], undefined, known)).toEqual({
      packages: ['@molecule/app-auth'],
      name: undefined,
      unknown: ['my-app'],
    })
    // The flag's only word is a package list, never the project name.
    expect(readCreatePackages(['my-app'], undefined, known).unknown).toEqual(['my-app'])
  })
})

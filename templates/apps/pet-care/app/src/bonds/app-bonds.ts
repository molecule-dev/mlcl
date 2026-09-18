/**
 * Pet-care app feature bonds.
 *
 * Wires concrete provider packages for the optional UI features used
 * across the app (data tables, file uploads, command palette, etc.).
 * Calendar and gallery surface their UX directly in pages today, so
 * they don't require a bond yet — wire a provider here if you adopt
 * one.
 */

import { bond } from '@molecule/app-bond'

// Wire concrete providers when the corresponding `*-{impl}` packages are added.
// Example, after `npm i @molecule/app-data-table-tanstack`:
//   import { provider as dataTable } from '@molecule/app-data-table-tanstack'
//   bond('data-table', dataTable)
//
// Until then, the abstract feature interfaces remain available but no
// runtime provider is registered.

export const appBondsRegistered = true
void bond

/**
 * The `search` and `section` inputs of `read_package_doc`, the same on the stdio and hosted servers.
 *
 * @module
 */

import { z } from 'zod'

/** The same bounded search input on stdio and hosted MCP. */
export const docSearchSchema = z
  .union([
    z
      .string()
      .min(1)
      .max(200)
      .refine((term) => !!term.trim()),
    z
      .array(
        z
          .string()
          .min(1)
          .max(200)
          .refine((term) => !!term.trim()),
      )
      .min(1)
      .max(6),
  ])
  .describe(
    'Case-insensitive literal string or up to 6 terms. Returns one complete bounded matching fenced example, README context/headings and available installed dist/**/*.d.ts declarations; never implementation JS.',
  )

/** One README section to read in full: a heading, or an exported function or type. */
export const docSectionSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((section) => !!section.trim())
  .describe(
    'A heading, or an exported function or type (findMany, DataStore), to read in full. Omit it to get a short README whole, or a long one as its overview and section index.',
  )

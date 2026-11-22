---
name: fix-build
description: Diagnose and fix type or lint errors, from the automated verification or `npx mlcl check`.
---

# Fix Build

The system type-checks and lints your changed files after you finish and hands you the errors. You can also run `tsc`, the linter or the build yourself at any point to see them sooner.

This skill is for fixing type or lint errors, wherever they were reported.

## Step 1: Read the Errors the User Reported

The user will share error messages from the automated verification. TypeScript errors include the file path, line number, and error message. Common patterns:

- **TS2305: Module has no exported member** — wrong import name. Read the package's README.md for correct exports.
- **TS2345: Argument type not assignable** — wrong parameter type. Check README.md for correct function signature.
- **TS2307: Cannot find module** — missing `.js` extension or package not installed.
- **TS2339: Property does not exist** — using wrong API. Read the relevant README.md.

## Step 2: Fix the Issues

1. Read the failing file to see current content
2. If the error is about a `@molecule/*` API, read its README.md: `node_modules/@molecule/{package-name}/README.md` (`/workspace/node_modules/…` in a molecule.dev sandbox)
3. Fix the cause — usually the code, sometimes config: a test that cannot find `fs` or `process` needs `"node"` in tsconfig `types`; a missing package needs installing. Config files are yours to change; just don't switch a check off to hide a real error.

## Step 3: Describe What You Fixed

Tell the user what you changed and why. **Do NOT claim the errors are fixed, that code is clean, or that linting passes.** The automated verification will run again after your response and show the actual status. Never tell the user "you may need to fix..." — do it yourself.

## Common Fixes

- **Wrong function name:** Check README.md for the exact export names
- **Wrong parameter types:** Check README.md for function signatures
- **Missing .js extension:** Add `.js` to all relative imports
- **Bond file errors:** Read the bond-system skill for the wiring each provider expects
- **ClassMap type errors:** Read the styling skill for valid values (e.g., textSize goes up to '6xl'; there is no parametric `cm.rounded(...)` — full-round is `cm.roundedFull`, and the sized radii use the raw `'rounded-md'`/`'rounded-lg'` string in `cm.cn(...)`)

---
'mlcl': patch
---

`mlcl add --inject` and `mlcl swap` now work in projects Molecule did not create (TypeScript or JavaScript, including CommonJS), add to a project's existing wiring instead of replacing it, and leave files they did not write unformatted.

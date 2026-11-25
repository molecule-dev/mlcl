---
'mlcl': patch
---

The API servers `mlcl` writes attach a bonded realtime provider before they start listening, and stop startup when an installed `@molecule/api-realtime` or lifecycle package fails to load instead of starting without it.

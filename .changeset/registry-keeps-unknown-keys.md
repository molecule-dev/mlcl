---
'mlcl': patch
---

Commands that write registry.json refuse when the file holds fields this mlcl version does not know, instead of deleting them, and a malformed intent hint is refused when the registry is read or written.

---
'mlcl': patch
---

`mlcl check` says in an e2e step's log that it is installing a missing Playwright browser and will run the step again, keeps the install's output in that log, and reports a stopped install as a timeout with the command to run.

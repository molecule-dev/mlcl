---
'mlcl': patch
---

`mlcl check --steps e2e` installs the Playwright browser a run reports missing and runs the tests again (saying so as the install starts), so a machine's first e2e run passes without a manual `playwright install`.

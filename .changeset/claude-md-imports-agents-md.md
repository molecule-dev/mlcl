---
'mlcl': patch
---

In a project with no CLAUDE.md, `mlcl setup` and `mlcl agent init` now add one that imports AGENTS.md, so Claude Code loads the conventions even under a folder with its own CLAUDE.md; an import in .claude/CLAUDE.md is read from that folder.

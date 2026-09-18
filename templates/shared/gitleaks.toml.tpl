# gitleaks configuration for {{PROJECT_NAME}}.
# Extends gitleaks' built-in rule set (the source of truth for secret patterns)
# and adds an allowlist for files that legitimately contain secret-LOOKING but
# non-secret strings, so the secret-scan CI gate stays signal, not noise.
title = "{{PROJECT_NAME}} secret-scan config"

[extend]
# Inherit every built-in gitleaks rule (AWS, Stripe, GitHub, generic API keys…).
useDefault = true

[allowlist]
description = "Non-secret files and placeholders"
paths = [
  # The committed schema reference — placeholder values only, never real secrets.
  '''\.env\.example$''',
  # Lockfiles contain integrity hashes that can trip generic high-entropy rules.
  '''package-lock\.json$''',
  '''(^|/)node_modules/''',
]
# Common placeholder tokens used in docs/examples.
regexes = [
  '''(?i)your[-_ ]?(api[-_ ]?)?key[-_ ]?here''',
  '''(?i)example[-_]?(secret|key|token)''',
  '''(?i)(changeme|placeholder|xxxx+)''',
]

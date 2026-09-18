# Security scanning — shipped with your Molecule project so it is
# secure-by-default from the first commit. See SECURITY.md for the full policy,
# how to run these checks locally, and the eslint-plugin-security rationale.
#
# Two independent gates run on every push/PR (and weekly, to catch newly
# disclosed advisories against code that has not changed):
#   - audit       — fails on a moderate-or-higher dependency vulnerability
#   - secret-scan — fails if a credential is committed to the working tree
#
# Dependabot (.github/dependabot.yml) opens PRs for vulnerable + outdated deps.
name: Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Mondays 06:00 UTC — re-audit unchanged code against the day's new advisories.
    - cron: '0 6 * * 1'

jobs:
  # Dependency vulnerability audit. `npm install` (not `npm ci`) so the job works
  # whether or not a package-lock.json is committed; `--no-audit` avoids a double
  # audit during install. Fail the build on moderate+ advisories.
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm install --no-audit --no-fund
      - run: npm audit --audit-level=moderate

  # Working-tree secret scan via gitleaks (runs in Docker on the runner, so no
  # marketplace-action license is needed). `--no-git` scans the checked-out files
  # — it catches a secret in an open PR before it is ever merged. The
  # .gitleaks.toml allowlist suppresses known non-secrets (.env.example, lockfiles).
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan for committed secrets (gitleaks)
        run: >-
          docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest
          detect --source=/repo --no-git --redact --verbose
          --config=/repo/.gitleaks.toml

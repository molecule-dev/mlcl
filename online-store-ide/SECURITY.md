# Security

online-store-ide ships secure-by-default. This document describes the automated
scanning that runs on every change, how to run it yourself, and how to report a
vulnerability.

## Automated scanning

Three layers run in CI (`.github/workflows/security.yml`) and continuously
(`.github/dependabot.yml`):

| Layer                | What it does                                                                              | Fails the build?                       |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| **Dependency audit** | `npm audit --audit-level=moderate` on every push/PR and weekly                            | Yes — on a moderate-or-higher advisory |
| **Secret scan**      | [gitleaks](https://github.com/gitleaks/gitleaks) over the working tree                    | Yes — on any committed credential      |
| **Dependabot**       | Opens PRs for vulnerable and outdated dependencies, and for the GitHub Actions themselves | n/a (PRs)                              |

The weekly schedule matters: a dependency you have not touched can become
vulnerable the day a new advisory is published, so the audit re-runs even when
nothing changed.

## Running the checks locally

```bash
# Dependency audit (same gate as CI)
npm audit --audit-level=moderate

# Secret scan (requires Docker; same invocation as CI)
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest \
  detect --source=/repo --no-git --redact --config=/repo/.gitleaks.toml
```

`.gitleaks.toml` allowlists known non-secrets (`.env.example`, lockfiles,
placeholder tokens). Add a path or regex there if you hit a false positive —
never disable the scan.

## Secrets

- All credentials are read from environment variables (`.env`, which is
  git-ignored along with the whole `.env*` family). Only `.env.example` — a
  values-free schema reference — is committed.
- Never hardcode an API key, token, or password in source. The secret scan will
  fail the build if you do.

## Why not `eslint-plugin-security`?

`eslint-plugin-security` is intentionally **not** wired into this project's lint
config, and that is a deliberate decision, not an oversight:

- Its high-value, low-false-positive rules target classes this stack's
  architecture already removes: there is **no raw SQL in handler code** (data
  access goes through the abstract `DataStore`), **no direct filesystem access**
  in request handlers, and **no `eval`**. Secrets flow through the config/secrets
  bond, not string concatenation.
- Its remaining rules (`detect-object-injection`,
  `detect-non-literal-fs-filename`, `detect-possible-timing-attacks`) are
  notoriously noisy — they fire on ordinary `obj[key]` access and any
  path-building — and in practice get globally disabled, defeating the purpose
  and eroding trust in the lint gate.
- The actual vulnerability surface a "vulnerability scan" is meant to cover —
  **known-vulnerable dependencies** and **leaked credentials** — is covered above
  by `npm audit`, Dependabot, and gitleaks, which are signal-rich and need no
  per-rule suppression.

If your code grows a genuinely security-sensitive surface (e.g. you add a
templating engine, dynamic `require`, or user-controlled regex), add the
specific rule that catches it rather than the whole plugin.

## Reporting a vulnerability

If you discover a security issue, please report it privately to the maintainers
rather than opening a public issue, so it can be fixed before disclosure.

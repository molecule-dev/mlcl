# mlcl ⇄ IDE parity manifest

The single source of truth for "can a user/agent do from the CLI/MCP everything
the IDE offers?" Every platform route group below carries a **decision**; the
companion gate (`scripts/check-parity-coverage.mjs`) fails when a route exists
on the platform but has no decision here — so the manifest can never silently
drift as the IDE grows.

Decisions:

- `parity` — a CLI command and/or MCP tool exists (listed)
- `local-equivalent` — the CLI does it locally instead of via the platform
  (scaffolding, staging, .env editing — the CLI's raison d'être)
- `ide-only` — deliberately not surfaced in the CLI (interactive UI surface;
  listed so the decision is explicit, not an accident)
- `gap` — no coverage yet; tracked for build-out

Status legend: ✅ parity · 🔶 partial · ⬜ gap · ➖ N/A

## Auth & account

| Capability                  | Route(s)                                               | Decision                                                         | CLI                                            | MCP                  | Status |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------- | -------------------- | ------ |
| Device-code login           | POST /cli/device-code, /cli/device-token, /cli/approve | parity                                                           | `login` (browser dance)                        | `login`/`login_poll` | ✅     |
| Token login (headless)      | GET /users/me                                          | parity                                                           | `login --token/--with-token`, `MOLECULE_TOKEN` | `whoami`             | ✅     |
| Logout                      | file unlink                                            | parity                                                           | `logout`                                       | `logout`             | ✅     |
| Whoami                      | GET /users/me                                          | parity                                                           | `whoami`                                       | `whoami`             | ✅     |
| Device/session list         | GET /devices                                           | parity                                                           | `device list`                                  | `list_devices`       | ✅     |
| Device rename               | PATCH /devices/:id                                     | parity                                                           | `device rename`                                | —                    | ✅     |
| Device revoke (kill-switch) | DELETE /devices/:id                                    | parity                                                           | `device revoke [--all-but-current]`            | `revoke_device`      | ✅     |
| Password/OAuth signup+login | POST /users, /users/log-in, oauth                      | ide-only (browser flows; the CLI's device-code path covers auth) | —                                              | —                    | ➖     |
| Password change / reset     | PATCH /users/:id/password, forgot/reset                | ide-only                                                         | —                                              | —                    | ➖     |
| Profile update              | PATCH /users/:id                                       | parity                                                           | `profile update`                               | —                    | ✅     |
| Account delete              | DELETE /users/:id                                      | parity                                                           | `account delete`                               | —                    | ✅     |
| GDPR data export            | GET /users/:id/data-export                             | parity                                                           | `account export`                               | —                    | ✅     |
| Guest claim                 | POST /guest/claim                                      | ide-only (signup boundary flow)                                  | —                                              | —                    | ➖     |

## Projects

| Capability                   | Route(s)                  | Decision                                                                         | CLI                                              | MCP                | Status |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------ | ------ |
| List projects                | GET /projects             | parity                                                                           | `project list`                                   | `list_projects`    | ✅     |
| Project detail               | GET /projects/:id         | parity                                                                           | `project get`                                    | —                  | ✅     |
| Open in IDE (deep link)      | — (URL shape)             | parity                                                                           | `project open` (prints workspace + preview URLs) | —                  | ✅     |
| Create project               | POST /projects            | parity (`project create` creates it on the platform; `create` scaffolds locally) | `project create`, `create`                       | `scaffold_project` | ✅     |
| Create from template (cloud) | POST /templates/:slug/use | local-equivalent                                                                 | `create --template`                              | `scaffold_project` | 🔶     |
| Update settings              | PATCH /projects/:id       | parity                                                                           | `project settings`                               | —                  | ✅     |
| Delete project               | DELETE /projects/:id      | parity                                                                           | `project delete`                                 | —                  | ✅     |
| Clone shared project         | POST /share/:slug/clone   | parity                                                                           | `share clone`                                    | —                  | ✅     |

## Sandbox & files

| Capability                   | Route(s)                             | Decision                                                                                    | CLI                          | MCP    | Status         |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------- | ------ | -------------- |
| Sandbox status               | GET /projects/:id/sandbox/status     | parity                                                                                      | `sandbox status`             | —      | ✅             |
| Start / stop / restart       | POST .../sandbox/start               | stop                                                                                        | restart                      | parity | `sandbox start | stop | restart` | —   | ✅  |
| Exec in sandbox              | POST /projects/:id/sandbox/exec      | parity                                                                                      | `sandbox exec -- <cmd>`      | —      | ✅             |
| Snapshots                    | POST/GET /snapshots, restore, DELETE | parity                                                                                      | `snapshot create             | list   | restore        | rm`  | —        | ✅  |
| File CRUD/search             | GET/PUT/DELETE /files/*, search      | parity (`sync` pushes a local tree into the sandbox through PUT /files/*; reads stay local) | `sync [dir] --dest <appDir>` | —      | ✅             |
| Terminal / LSP / presence WS | /ws/projects/:id/*                   | ide-only (interactive sockets)                                                              | —                            | —      | ➖             |
| Egress policy                | GET /egress, allowlist POST/DELETE   | parity                                                                                      | `egress get/approve/revoke`  | —      | ✅             |
| Logs / log stream            | GET /logs, /logs/stream              | parity                                                                                      | `logs [--stream]`            | —      | ✅             |
| Preview health               | GET /preview/health/stream           | ide-only (SSE UI)                                                                           | —                            | —      | ➖             |

## Git

| Capability             | Route(s)                                        | Decision                                       | CLI                                                  | MCP | Status |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- | --- | ------ |
| Status / diff / revert | git-status, git-diff, git-revert                | local-equivalent (local `git` in the checkout) | —                                                    | —   | ➖     |
| Push to remote         | POST /git-push                                  | parity                                         | `git push` (platform-mediated, reuses sandbox creds) | —   | ✅     |
| Pull from remote       | POST /git-pull                                  | parity                                         | `git pull`                                           | —   | ✅     |
| Repo import            | git-repos, git-import-source, git-import-upload | parity                                         | `import repos/source/upload`                         | —   | ✅     |
| SSH key store          | PUT /git-ssh-key                                | parity                                         | `git ssh-key`                                        | —   | ✅     |
| OAuth for git          | git-auth/:provider                              | ide-only (browser round-trip)                  | —                                                    | —   | ➖     |

## Deploy & CI

| Capability                 | Route(s)                          | Decision | CLI                         | MCP               | Status |
| -------------------------- | --------------------------------- | -------- | --------------------------- | ----------------- | ------ |
| Deploy to production       | POST /deployments                 | parity   | `deploy --follow`           | —                 | ✅     |
| Deployment list/detail     | GET /deployments(/:id)            | parity   | `deploy list/status`        | —                 | ✅     |
| Cancel deployment          | DELETE /deployments/:id           | parity   | `deploy cancel`             | —                 | ✅     |
| CI workflow generate/apply | GET/POST /workflows/:platform     | parity   | `deploy workflow github     | gitlab [--apply]` | —      | ✅  |
| Custom domains             | GET/POST /domains, verify, DELETE | parity   | `domain list/add/verify/rm` | —                 | ✅     |

## Environment & secrets

| Capability              | Route(s)                 | Decision         | CLI                                                                                                                                       | MCP                                                         | Status |
| ----------------------- | ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| Local .env CRUD         | —                        | local-equivalent | `env list/get/set/unset`                                                                                                                  | `list_env_vars`/`get_env_var`/`set_env_var`/`unset_env_var` | ✅     |
| Platform env read/write | GET/PUT /env             | parity           | `env pull/push`                                                                                                                           | `pull_env_vars`/`push_env_vars`                             | ✅     |
| Env detected keys       | GET /env/detected        | parity           | `env detected` (cloud) · `env check` (local equivalent — code reads + registry declarations vs the workspace .env files, `--fix` appends) | `check_env_vars`                                            | ✅     |
| Vault secrets           | /vault CRUD              | parity           | `vault list/set/rm`                                                                                                                       | —                                                           | ✅     |
| Vault runtime tokens    | /vault/token mint/revoke | parity           | `vault token [--revoke]`                                                                                                                  | —                                                           | ✅     |
| Credential broker       | /vault/broker            | parity           | `vault broker [--disable]`                                                                                                                | —                                                           | ✅     |
| Project API keys (mk_)  | /api-keys CRUD           | parity           | `apikey list/create/rm`                                                                                                                   | `create_api_key`                                            | ✅     |

## Database

| Capability                      | Route(s)             | Decision         | CLI                                          | MCP              | Status |
| ------------------------------- | -------------------- | ---------------- | -------------------------------------------- | ---------------- | ------ |
| Local migrate/reset/console/url | —                    | local-equivalent | `db migrate/reset/console/url`               | —                | ✅     |
| Cloud connection info           | GET /database        | parity           | `db info`                                    | —                | ✅     |
| SQL console (cloud)             | POST /database/query | parity           | `db query`                                   | —                | ✅     |
| Schema tables                   | GET /database/tables | parity           | `db info`                                    | —                | ✅     |
| Backups create/list/restore     | /database/backups    | parity           | `db backup list/create/restore`              | —                | ✅     |
| Project eject/export            | GET /export          | parity           | `project export` (streams the eject .tar.gz) | `export_project` | ✅     |

## Team & sharing

| Capability                             | Route(s)                                                      | Decision                                      | CLI                               | MCP                                                           | Status |
| -------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- | --------------------------------- | ------------------------------------------------------------- | ------ |
| Project team list                      | GET /team                                                     | parity                                        | `team list`                       | —                                                             | ✅     |
| Invite member                          | POST /team/invite                                             | parity                                        | `team invite <email> --role`      | —                                                             | ✅     |
| Revoke invite / remove / role          | DELETE/PATCH /team/*                                          | parity                                        | `team revoke/set-role/rm`         | —                                                             | ✅     |
| My invitations                         | GET /invitations, accept/decline                              | parity                                        | `invitations list/accept/decline` | —                                                             | ✅     |
| Share links mint/revoke                | POST/GET/DELETE /shares                                       | parity                                        | `share list/create/rm`            | —                                                             | ✅     |
| Public transcripts / workspace         | PUT /public-transcript, PUT /public-workspace                 | parity                                        | `share visibility`                | `share_visibility`                                            | ✅     |
| Session transcripts import/list/remove | POST/GET/DELETE /transcripts                                  | parity                                        | `transcripts import/list/rm`      | `import_transcripts`, `list_transcripts`, `remove_transcript` | ✅     |
| Public session + file views            | GET /share/:slug/sessions(/:id), GET /share/:slug/files(/raw) | ide-only (the public share page for visitors) | —                                 | —                                                             | ✅     |

## Builds & tests

| Capability        | Route(s)                    | Decision                                        | CLI                 | MCP | Status |
| ----------------- | --------------------------- | ----------------------------------------------- | ------------------- | --- | ------ |
| Mobile build      | POST /builds/mobile         | parity                                          | `build mobile`      | —   | ✅     |
| Desktop build     | POST /builds/desktop        | parity                                          | `build desktop`     | —   | ✅     |
| Build list/detail | GET /builds(/:id)           | parity                                          | `build list/status` | —   | ✅     |
| Test discovery    | GET /tests                  | local-equivalent (scaffolded vitest/playwright) | —                   | —   | ➖     |
| Test run (SSE)    | POST /tests/run             | local-equivalent                                | —                   | —   | ➖     |
| Scheduled tasks   | GET/DELETE /scheduled-tasks | parity                                          | `tasks list/cancel` | —   | ✅     |

## AI / chat (Synthase)

| Capability    | Route(s)        | Decision                                                                      | CLI          | MCP | Status |
| ------------- | --------------- | ----------------------------------------------------------------------------- | ------------ | --- | ------ |
| Chat turn     | POST /chat      | ide-only (the IDE's premium; agents use their OWN harness + molecule tooling) | —            | —   | ➖     |
| Model catalog | GET /ai/models  | parity                                                                        | `models`     | —   | ✅     |
| Chat usage    | GET /chat-usage | parity                                                                        | `usage chat` | —   | ✅     |

## Usage & billing

| Capability                   | Route(s)                   | Decision               | CLI                      | MCP | Status |
| ---------------------------- | -------------------------- | ---------------------- | ------------------------ | --- | ------ |
| Project/account usage        | GET usage                  | parity                 | `usage [--project <id>]` | —   | ✅     |
| Pricing tiers                | GET /tiers                 | parity                 | `usage tiers`            | —   | ✅     |
| Billing portal / plan change | billing-portal, PATCH plan | ide-only (payment UIs) | —                        | —   | ➖     |

## Scaffolding & packages (the CLI's home turf)

| Capability               | Route(s)       | Decision                            | CLI                              | MCP                         | Status |
| ------------------------ | -------------- | ----------------------------------- | -------------------------------- | --------------------------- | ------ |
| Scaffold project         | —              | local-equivalent                    | `create`                         | `scaffold_project`          | ✅     |
| Template gallery         | GET /templates | local-equivalent (bundled registry) | `templates`                      | `list_templates`            | ✅     |
| Package search           | —              | local-equivalent                    | `search`                         | `search_packages`           | ✅     |
| Add/inject/swap packages | —              | local-equivalent                    | `add/inject/swap`                | `add_package/swap_provider` | ✅     |
| Package docs             | —              | local-equivalent                    | (node_modules READMEs)           | `read_package_doc`          | ✅     |
| Staging envs             | —              | local-equivalent                    | `stage up/down/list/status/logs` | —                           | ✅     |
| Agent wiring             | —              | local-equivalent                    | `agent init`, `mcp install`      | `agent_init`                | ✅     |

## Capability services (hosted)

Capabilities molecule runs on its own vendor accounts for a project —
`POST /v1/services/:service/:operation` — exposed MCP-first and in app code via
`@molecule/*` bonds (e.g. `@molecule/api-ai-embeddings-molecule`). Metered to
the project whose `MOLECULE_API_KEY` the tool call uses.

| Capability            | Route(s)                                    | Decision | CLI | MCP                                 | Status |
| --------------------- | ------------------------------------------- | -------- | --- | ----------------------------------- | ------ |
| Embeddings            | POST /v1/services/embeddings/embed          | parity   | —   | `embed_text`                        | ✅     |
| Translation           | POST /v1/services/translation/translate     | parity   | —   | `translate`                         | ✅     |
| Text-to-speech        | POST /v1/services/speech/synthesize         | parity   | —   | `text_to_speech`                    | ✅     |
| Transcription (STT)   | POST /v1/services/speech/transcribe         | parity   | —   | `transcribe_audio`                  | ✅     |
| Moderation            | POST /v1/services/moderation/*              | parity   | —   | `moderate_content`                  | ✅     |
| OCR / text extract    | POST /v1/services/ocr/recognize             | parity   | —   | `extract_text`                      | ✅     |
| Web search            | POST /v1/services/web-search/search         | parity   | —   | `web_search`                        | ✅     |
| Image generation      | POST /v1/services/image-generation/generate | parity   | —   | `generate_image`                    | ✅     |
| Unattended agent runs | POST /v1/agent-runs, GET /:id, /:id/cancel  | parity   | —   | `submit_agent_run`, `get_agent_run` | ✅     |

## Ops

| Capability             | Route(s)                  | Decision            | CLI               | MCP      | Status |
| ---------------------- | ------------------------- | ------------------- | ----------------- | -------- | ------ |
| Telemetry              | POST /v1/telemetry/cli    | parity (opt-out)    | built-in          | built-in | ✅     |
| Status page            | GET /status/history, /rss | parity              | `status`          | —        | ✅     |
| Activities list/export | GET /activities           | parity              | `activities list` | —        | ✅     |
| Analytics dashboards   | /analytics/*              | ide-only (admin UI) | —                 | —        | ➖     |

---

## Maintenance

- **The gate:** `node scripts/check-parity-coverage.mjs` walks molecule-dev's
  `router.ts` route strings and fails on any route not matched by a decision
  row here. Run in CI (and `fresh.sh`).
- **The live proof:** `node scripts/e2e-parity-local.mjs` exercises every
  `parity` row against the running local stack (needs `npm run dev` in
  molecule-dev + the test-user setup from e2e-login-local).

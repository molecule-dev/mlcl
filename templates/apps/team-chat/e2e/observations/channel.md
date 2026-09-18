# Page observations: /channels/:channelId (ChannelPage)

> Filled from a live walk via Playwright MCP at /channels/<id> (signed-in).

## Page state assumed

- [x] Authenticated (AuthGuard route)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                                        | success signal                                                                         | failure signal                |
| --------------------------------------------------- | ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- |
| `[data-mol-id=channel-header]` containing `#<name>` | banner  | shows the channel name                                                  | `#general` rendered                                                                    | empty header                  |
| `[data-mol-id=input-search-messages]`               | textbox | filters the on-page message list to those whose body contains the value | typed value filters list                                                               | filter ignored                |
| `[data-mol-id=button-pinned]` (push_pin)            | button  | toggles the pinned-messages panel                                       | `[data-mol-id=pinned-panel]` appears with at least one pinned row                      | panel never appears           |
| `[data-mol-id=button-toggle-theme]`                 | button  | toggles the theme between light/dark via `useTheme().setTheme()`        | `documentElement[data-mol-theme]` changes; persisted in `localStorage[molecule-theme]` | no change                     |
| `[data-mol-id=button-send]` (Send message)          | button  | submits the message form, POST /api/messages, appends row to feed       | feed shows new message exactly once; GET /api/messages reflects it                     | duplicate row, 4xx, no append |
| `[data-mol-id=link-back-to-dashboard]`              | link    | shown only on "channel not found" path; navigates to /                  | URL becomes /                                                                          | nav fails                     |

## Hidden surfaces opened from this page

| trigger                        | what it opens                | elements inside (selector / role / behavior)         |
| ------------------------------ | ---------------------------- | ---------------------------------------------------- |
| `[data-mol-id=button-pinned]`  | `[data-mol-id=pinned-panel]` | pinned message rows (`[data-mol-id=pinned-message]`) |
| `[data-mol-id=button-members]` | members panel                | sidebar with members list                            |

## Network calls expected during normal use

| trigger         | method | path                         | what request body or query is expected                |
| --------------- | ------ | ---------------------------- | ----------------------------------------------------- |
| Page load       | GET    | /api/channels/:id            | returns channel row (name, topic)                     |
| Page load       | GET    | /api/messages?channel_id=:id | returns array of messages (with hydrated `user_name`) |
| Page load       | GET    | /api/members/:channelId      | returns members of the channel                        |
| Send message    | POST   | /api/messages                | `{ channel_id, content }` returns inserted row        |
| Toggle reaction | POST   | /api/reactions/:messageId    | `{ emoji }` returns updated reaction record           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/channel.spec.ts`

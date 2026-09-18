# Page observations: /upload (Upload)

> Authed — file picker + title + tags inputs. Optional album select
> (populated by current user's albums; preselects `?album_id=<id>` query
> param). Two-stage upload: `POST /api/photo-uploads` (multipart) then
> `POST /api/photos` (json) with the returned storage key. Success rows
> get `data-testid="upload-row-done"`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role        | expected behavior on interaction   | success signal               | failure signal         |
| ------------------------------------------- | ----------- | ---------------------------------- | ---------------------------- | ---------------------- |
| `[data-testid="upload-title"]`              | textbox     | accepts title for the next file    | input updates                | read-only              |
| `[data-testid="upload-tags"]`               | textbox     | accepts comma-separated tags       | input updates                | read-only              |
| `[data-testid="upload-album-select"]`       | combobox    | choose target album (if any)       | value matches `?album_id=`   | wrong value            |
| `[data-testid="upload-input"]` (file input) | file picker | runs the two-stage upload pipeline | row goes from pending → done | failure row            |
| `[data-testid="upload-row-done"]`           | row         | indicates upload succeeded         | row visible                  | row absent / row error |
| Upload page heading                         | heading     | identifies the page                | heading visible              | empty page             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected                            |
| --------- | ------ | ------------------ | ----------------------------------------------------------------- |
| Pick file | POST   | /api/photo-uploads | multipart `photo` field; 201 returns `{ id, url, width, height }` |
| Then      | POST   | /api/photos        | `{ title, original_url, ..., album_id? }`; 201 returns `{ id }`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/upload.spec.ts`

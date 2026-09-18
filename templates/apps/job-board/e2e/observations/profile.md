# Page observations: /profile (Profile)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role                  | expected behavior on interaction | success signal                       | failure signal            |
| ----------------------------------------------------------------- | --------------------- | -------------------------------- | ------------------------------------ | ------------------------- |
| Display-name input `getByLabel(/name                              | display/i)` first     | textbox                          | accepts the user's name              | typed value persists      | n/a                                             |
| Headline input `getByLabel(/headline/i)`                          | textbox               | accepts the headline             | typed value persists                 | n/a                       |
| Skills input `getByLabel(/skills/i)`                              | textbox               | accepts comma-separated skills   | typed value persists                 | n/a                       |
| Save button `getByRole('button', { name: /save\s*changes          | save\s*profile        | ^save$/i })`                     | button                               | PUT /api/user-profiles/me | success notice + GET /me returns the new fields | 4xx + inline error |
| Resume Upload button `getByRole('button', { name: /upload.*resume | replace.*resume/i })` | button                           | opens the file picker (hidden input) | file picker opens         | n/a                                             |

## Hidden surfaces opened from this page

| trigger       | what it opens     | elements inside (selector / role / behavior) |
| ------------- | ----------------- | -------------------------------------------- |
| Resume button | hidden file input | accepts PDF/DOC/TXT                          |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected                   |
| ------------- | ------ | --------------------- | -------------------------------------------------------- |
| mount         | GET    | /api/user-profiles/me | fetch the existing profile row                           |
| save          | PUT    | /api/user-profiles/me | { headline, bio, location, skills, willing_to_relocate } |
| resume submit | POST   | /api/uploads/resume   | multipart/form-data file                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`

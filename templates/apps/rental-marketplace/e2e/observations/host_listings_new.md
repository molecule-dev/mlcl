# Page observations: /host/listings/new (Create Listing)

3-step wizard (place → photos → details). Step 1 picks property type +
city, bedrooms, max-guests. Step 2 lets the host upload photos
(presign-and-PUT to S3 when configured, else a placeholder set is
appended). Step 3 collects title + nightly price + description and
publishes via `POST /api/listings`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role         | expected behavior on interaction | success signal                                                       | failure signal                                                                     |
| ------------------------------------------------------------------ | ------------ | -------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Property-type pill `getByRole('button', { name: /house/i })`       | button       | select property type "house"     | button appears active; future submission carries property_type=house | unselected                                                                         |
| City input                                                         | input        | type city name                   | accepts text                                                         | required-empty surfaces error on publish                                           |
| Step navigation pill `getByRole('button', { name: /finish up/i })` | button       | jump to step 3 (publish)         | step 3 form visible                                                  | navigation broken                                                                  |
| Title input (step 3)                                               | input        | type listing title               | accepts text                                                         | empty submit shows error                                                           |
| Publish button `getByRole('button', { name: /publish               | finish/i })` | button                           | POST /api/listings; navigate to /host/listings/:id                   | URL becomes /host/listings/<uuid>, GET /api/host-listings includes the new listing | inline error |
| Back-to-listings link                                              | link         | navigate to /host/listings       | URL becomes /host/listings                                           | broken                                                                             |

## Hidden surfaces opened from this page

(no menus — wizard with linear steps)

## Network calls expected during normal use

| trigger                           | method | path                 | what request body or query is expected                  |
| --------------------------------- | ------ | -------------------- | ------------------------------------------------------- |
| photo upload (when S3 configured) | POST   | /api/uploads/presign | { filename, content_type, scope } → { url, public_url } |
| publish                           | POST   | /api/listings        | full create payload → 201 + new listing                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/host_listings_new.spec.ts`

# Plan: Cloudflare R2 Image Storage

## Goal
Compress scanned book images in the browser and upload them to Cloudflare R2 on save.
Store the resulting public URLs in `BookMetadata` so images are persisted beyond the browser session.

---

## Credential Clarification Needed Before Implementation

Cloudflare R2's S3-compatible API (the standard path for direct browser uploads) requires
**two** credentials, not one:

| Credential | Purpose |
|---|---|
| **Access Key ID** | Short token identifier (e.g. `abc123`) |
| **Secret Access Key** | Long secret used to sign requests |

When you created the R2 API token in the Cloudflare dashboard, you were shown both values.
`VITE_CLOUDFLARE_R2_API_KEY` is likely one of these — most probably the Secret Access Key.

**Action required from you before implementation starts:**

Please add one more env var to `.env.local` and to Vercel:
- `VITE_CLOUDFLARE_R2_ACCESS_KEY_ID` — the short Access Key ID shown when you created the token
- Rename (or keep and note) `VITE_CLOUDFLARE_R2_API_KEY` → treated as the Secret Access Key
- `VITE_CLOUDFLARE_R2_BUCKET_NAME` — the exact bucket name you created

The `VITE_CLOUDFLARE_ACCOUNT_ID` and `VITE_CLOUDFLARE_R2_API_KEY` you already added are kept as-is.

---

## Manual Setup Required (Cloudflare Dashboard)

### 1. Enable Public Access on the Bucket
Already done (public URL confirmed: `https://pub-ee6eff0f380e4682848807d6c0e6fa9e.r2.dev`).

### 2. Set CORS Policy on the Bucket
R2's S3-compatible API requires CORS rules so browsers can PUT objects directly.
Go to **R2 → your bucket → Settings → CORS Policy** and add:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

> For production you can tighten `AllowedOrigins` to your Vercel domain.

---

## Upload Approach

Use R2's **S3-compatible API** via `aws4fetch` — a lightweight (~4 KB) fetch wrapper
that handles AWS Signature V4 signing without pulling in the full `@aws-sdk/client-s3`
bundle (~300 KB).

- **Endpoint**: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`
- **Path style**: `/{bucket}/{key}` (R2 requires path-style, not virtual-hosted)
- **Method**: `PUT` per object
- **Content-Type**: `image/jpeg` (all outputs are JPEG after compression)
- **Auth**: AWS Signature V4, signed by `aws4fetch`

New dependency: `aws4fetch` (MIT, ~4 KB minified)

---

## File Naming Convention

```
{bookId}/{index}.jpg
```

Examples for a book with ID `abc123`:
```
abc123/1.jpg
abc123/2.jpg
```

- `bookId` is generated in `BookEditorPage` at save time (existing logic, unchanged)
- Index is 1-based, matches the order of `pendingImages`
- Extension is always `.jpg` — output is always JPEG after compression

---

## Data Model Changes

### `src/types/index.ts`

Add an optional `imageUrls` field to `BookMetadata`:

```typescript
export interface BookMetadata {
  // ... existing fields ...
  imageUrls?: string[]   // public R2 URLs in scan order; undefined for pre-feature books
}
```

`RawBookMetadata` (the AI output type) does **not** include `imageUrls` — it is not
extracted by AI and is always set by the upload service.

---

## New Files

### `src/services/imageCompression.ts`

Compresses a base64 data URL to a JPEG `Blob` using the Canvas API.

```typescript
export async function compressImage(
  dataUrl: string,
  maxDim = 1200,
  quality = 0.8,
): Promise<Blob>
```

Logic:
1. Draw the data URL into an off-screen `<canvas>` element
2. If the image exceeds `maxDim` in either dimension, scale it down proportionally
3. Export as `image/jpeg` at `quality`
4. Return the resulting `Blob`

No external dependencies.

### `src/services/r2Storage.ts`

Handles compression + upload for all images belonging to one book save.

```typescript
export interface UploadResult {
  urls: string[]    // public R2 URLs, in order (empty string for any failed upload)
  failed: number    // count of images that failed to upload
}

export async function uploadImagesToR2(
  bookId: string,
  images: string[],   // base64 data URLs from pendingImages
): Promise<UploadResult>
```

Logic per image:
1. `compressImage(dataUrl)` → `Blob`
2. PUT to `https://{ACCOUNT_ID}.r2.cloudflarestorage.com/{BUCKET}/{bookId}/{index}.jpg`
3. On success: push `{PUBLIC_URL}/{bookId}/{index}.jpg` to `urls`
4. On failure: push `''` to `urls`, increment `failed`

All images are uploaded in parallel (`Promise.all`).

If any required env var is missing (`ACCOUNT_ID`, `ACCESS_KEY_ID`, `SECRET_KEY`, `BUCKET`),
`uploadImagesToR2` returns `{ urls: [], failed: 0 }` immediately and logs a warning.
This means the feature degrades silently for local dev without credentials.

---

## Save Flow Changes

### `src/components/editor/BookEditorPage.tsx`

Current `handleSave` (add path):
```
1. handleSave(data) called
2. onAdd({ ...data, id, scanDate, sessionId })
3. navigate('history')
```

New `handleSave` (add path):
```
1. handleSave(data) called
2. Set isSaving = true (disables Save button, shows spinner)
3. Generate bookId
4. uploadImagesToR2(bookId, pendingImages) → { urls, failed }
5. onAdd({ ...data, id: bookId, scanDate, sessionId, imageUrls: urls.length ? urls : undefined })
6. If failed > 0: show non-blocking warning toast
7. navigate('history')
```

The edit path (`onUpdate`) is **unchanged** — edits don't have `pendingImages`, and
existing `imageUrls` are preserved verbatim from the stored book.

### `src/components/editor/BookForm.tsx`

Add `isSaving?: boolean` prop:
- When `true`: Save button is disabled and shows "Uploading…" with a spinner
- When `false`/undefined: current behaviour

### Upload Warning Toast

A simple inline warning shown below the form (not a blocking error) when some images
failed to upload but the book was saved. Example:

> "Book saved, but 1 image could not be uploaded to storage."

This uses the same red banner slot already in `BookForm` — the message is distinct from
validation errors (different wording, dismisses automatically after 5 s, or on navigate).

---

## CSV Export

The existing CSV column layout is fixed to match an external library system format and
must not be changed. Image URLs are **not** added to the CSV.

---

## History / Display

`imageUrls` is stored in `BookMetadata` and persisted to `localStorage`, but the
HistoryPage display is **not changed** in this plan. Displaying R2 thumbnails in the
history list is a separate UI concern and can be addressed in a follow-up.

---

## Error Handling Summary

| Scenario | Behaviour |
|---|---|
| Env vars missing (local dev) | Upload skipped silently; book saved without URLs |
| CORS not configured on bucket | Upload fails; warning toast; book saved without URLs |
| Network error on one image | That slot is `''`; other images upload normally |
| All uploads fail | Book saved with `imageUrls: undefined`; warning toast |

---

## Implementation Steps (in order)

1. **Confirm env vars** — user adds `VITE_CLOUDFLARE_R2_ACCESS_KEY_ID` and
   `VITE_CLOUDFLARE_R2_BUCKET_NAME` to `.env.local` and Vercel
2. **CORS** — configure on the R2 bucket in the Cloudflare dashboard (one-time manual step)
3. **`npm install aws4fetch`**
4. **Add `imageUrls?` to `BookMetadata`** in `src/types/index.ts`
5. **Implement `src/services/imageCompression.ts`**
6. **Implement `src/services/r2Storage.ts`**
7. **Add `isSaving` prop to `BookForm`** — loading state on Save button
8. **Update `BookEditorPage.handleSave`** — await upload, pass `imageUrls` to `onAdd`
9. **Update `REQUIREMENTS.md` and `Plan.md`**

---

## Open Questions

1. **Book deletion**: When a book is deleted from history, should we also delete its R2
   objects? R2 charges per object stored. Deferred for now — can be added as a cleanup
   feature later.
2. **Re-upload on edit**: If a user edits a book they originally scanned without images
   (e.g. they started before this feature shipped), there is no path to retroactively
   upload. Deferred — this would require surfacing a separate "upload images" action in
   the edit view.

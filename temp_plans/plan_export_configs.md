# Gronthee — User-Defined Export Configs

**Generated:** 2026-04-24
**Feature:** Configurable CSV export formats; per-session config association; share/import.
**Backward compatibility:** Mandatory — existing sessions, books, and exports must continue to work unchanged.

---

## 1. Goal

Replace the single hard-coded CSV export shape (`src/services/csv.ts` — `HEADERS` + `toRow`) with a user-configurable schema. Each schema is an **Export Config**:

- An ordered list of output columns.
- Each column has a `header` (CSV column name) and a `type`:
  - **`mapped`** — value pulled from a `BookMetadata` field.
  - **`constant`** — fixed string supplied at config time (may be empty).
- More column types may be added later (e.g. `computed`, `template`); the data model and code are designed to accept new variants without breaking existing configs.

Users get a new top-level **Configs** tab where they can create, edit, save, delete, share (export to JSON file), and import configs. When creating a session, the user must pick a config; the chosen config is stored on the session record and used for that session's CSV export.

The current export shape is preserved by shipping a built-in **Dishari** config at `src/config/dishari-export-config.json` (id `dishari`). Existing sessions and saved books transparently use it.

The "Include R&D columns" checkbox is **kept** as an orthogonal toggle — R&D columns are not part of any config and are appended at export time when the box is ticked.

---

## 2. Design Decisions

### 2.1 Data model

Add to `src/types/index.ts`:

```typescript
export type ExportColumnType = 'mapped' | 'constant'

export interface MappedExportColumn {
  type: 'mapped'
  header: string                // CSV column name
  field: BookField              // see BookField below
}

export interface ConstantExportColumn {
  type: 'constant'
  header: string
  value: string                 // may be empty
}

export type ExportColumn = MappedExportColumn | ConstantExportColumn

export interface ExportConfig {
  id: string                    // URL-safe slug; 'dishari' is reserved (built-in)
  name: string                  // user-facing display name
  description?: string          // optional short description
  builtIn?: boolean             // true for the bundled Dishari config
  columns: ExportColumn[]
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601
}

// Whitelist of fields a Mapped column may bind to.
// R&D-only fields (id, imageUrls, rawAIOutput) are NOT part of this list —
// they are surfaced exclusively via the R&D checkbox at export time.
export type BookField =
  | 'title' | 'subTitle' | 'otherTitle'
  | 'author' | 'secondAuthor' | 'editor' | 'translator' | 'illustrator'
  | 'publisher' | 'publishedYear' | 'publishedYearBengali'
  | 'isbn' | 'category' | 'genre' | 'collection' | 'itemType'
  | 'pageCount' | 'language' | 'edition' | 'publicationPlace'
  | 'scanDate' | 'summary'
```

Update `Session`:

```typescript
export interface Session {
  id: string
  name: string
  createdAt: string
  configId: string              // NEW — id of the export config used for this session
}
```

`BookMetadata` is unchanged.

### 2.2 The Dishari config (shipped in repo)

`src/config/dishari-export-config.json` — committed:

```json
{
  "id": "dishari",
  "name": "Dishari",
  "description": "Built-in export format matching the external library system schema.",
  "builtIn": true,
  "columns": [
    { "type": "mapped",   "header": "ISBN",                       "field": "isbn" },
    { "type": "mapped",   "header": "Language",                   "field": "language" },
    { "type": "mapped",   "header": "Author",                     "field": "author" },
    { "type": "mapped",   "header": "Title",                      "field": "title" },
    { "type": "mapped",   "header": "Sub Title",                  "field": "subTitle" },
    { "type": "mapped",   "header": "Other Title",                "field": "otherTitle" },
    { "type": "mapped",   "header": "Edition",                    "field": "edition" },
    { "type": "mapped",   "header": "Publication Place",          "field": "publicationPlace" },
    { "type": "mapped",   "header": "Publisher",                  "field": "publisher" },
    { "type": "mapped",   "header": "Published Year",             "field": "publishedYear" },
    { "type": "mapped",   "header": "Page Count",                 "field": "pageCount" },
    { "type": "constant", "header": "other physical details",     "value": "" },
    { "type": "constant", "header": "Series",                     "value": "" },
    { "type": "constant", "header": "Note Area",                  "value": "" },
    { "type": "mapped",   "header": "Category",                   "field": "category" },
    { "type": "mapped",   "header": "Genre",                      "field": "genre" },
    { "type": "constant", "header": "Subject 3",                  "value": "" },
    { "type": "constant", "header": "Subject 4",                  "value": "" },
    { "type": "constant", "header": "Subject 5",                  "value": "" },
    { "type": "mapped",   "header": "Second Author",              "field": "secondAuthor" },
    { "type": "constant", "header": "Third Column",               "value": "" },
    { "type": "mapped",   "header": "Editor",                     "field": "editor" },
    { "type": "constant", "header": "Compiler",                   "value": "" },
    { "type": "mapped",   "header": "Translator",                 "field": "translator" },
    { "type": "mapped",   "header": "Illustrator",                "field": "illustrator" },
    { "type": "mapped",   "header": "Item Type",                  "field": "itemType" },
    { "type": "constant", "header": "Status",                     "value": "" },
    { "type": "mapped",   "header": "Collection",                 "field": "collection" },
    { "type": "constant", "header": "Home Branch",                "value": "" },
    { "type": "constant", "header": "Holding Branch",             "value": "" },
    { "type": "constant", "header": "Shelving Location",          "value": "" },
    { "type": "mapped",   "header": "Scan Date",                  "field": "scanDate" },
    { "type": "constant", "header": "Source of Aquisition",       "value": "" },
    { "type": "constant", "header": "Cost, normal purchase price", "value": "" },
    { "type": "constant", "header": "Call No",                    "value": "" },
    { "type": "constant", "header": "BarCode",                    "value": "" },
    { "type": "constant", "header": "Public Note",                "value": "" },
    { "type": "constant", "header": "Second Copy",                "value": "" },
    { "type": "constant", "header": "Third Copy",                 "value": "" },
    { "type": "constant", "header": "Fourth Copy",                "value": "" }
  ],
  "createdAt": "2026-04-24T00:00:00.000Z",
  "updatedAt": "2026-04-24T00:00:00.000Z"
}
```

The Dishari config is **read-only** (cannot be edited or deleted). Users may **clone** it as a starting point for a new config.

### 2.3 Storage

| localStorage key | Type | Notes |
|---|---|---|
| `gronthee:exportConfigs` | `ExportConfig[]` | User-created configs only. `dishari` is never persisted here. |

`gronthee:sessions` already exists; sessions gain a `configId` field. Migration on load: any session lacking `configId` → set to `'dishari'` and persist.

The Dishari config is bundled at build time via `import dishariConfig from '@/config/dishari-export-config.json'`. The hook merges it with user configs to present a unified list.

Add `gronthee:exportConfigs` to the reset-all key list in `AppShell.tsx`.

### 2.4 R&D columns — kept as an orthogonal toggle

The "Include R&D columns" checkbox in `ExportSessionDialog` is **preserved as-is**. Behaviour is unchanged:

- When ticked, three columns are appended **after** whatever columns the session's config produces: `Book ID` (book id), `Images` (`JSON.stringify(imageUrls)`), `Prompt Output` (`rawAIOutput`).
- Filename prefix `gronthee-rnd-` is preserved when the box is ticked.
- This applies regardless of which config the session uses — including custom user configs — so R&D output is consistent across all sessions.

R&D fields stay **out of the config model**: `id`, `imageUrls`, and `rawAIOutput` are not in `BookField` and cannot be added as Mapped columns. This keeps configs focused on the catalog schema and avoids a second way to produce R&D output (which would be confusing).

### 2.5 Session ↔ Config relationship

- A session points to exactly one config via `configId`.
- Default session is `configId = 'dishari'` and that's locked (Default session is already non-editable).
- New session creation always asks for a config (defaulting to Dishari).
- If a user-created config is deleted, any sessions pointing at it fall back to `'dishari'` (mirrors the "books fall back to Default session on delete" pattern already in place).
- Sessions never store inline config data — only the id. This way editing a config affects all sessions that reference it, which is the intuitive behaviour (e.g. user fixes a typo in a column header → all future exports pick it up).

### 2.6 CSV generation rewrite

`src/services/csv.ts` becomes config-driven, with R&D appending preserved:

```typescript
const RND_HEADERS = ['Book ID', 'Images', 'Prompt Output']

function renderCell(book: BookMetadata, column: ExportColumn): string {
  if (column.type === 'constant') return column.value
  return (book[column.field] as string | undefined) ?? ''
}

function rndRow(book: BookMetadata): string[] {
  return [
    book.id,
    book.imageUrls && book.imageUrls.length > 0 ? JSON.stringify(book.imageUrls) : '',
    book.rawAIOutput ?? '',
  ]
}

export function exportToCsv(
  books: BookMetadata[],
  filename: string,
  config: ExportConfig,
  includeRnd = false,
): void { … }

export function exportSessionsToCsv(
  sessions: Session[],
  books: BookMetadata[],
  username: string,
  resolveConfig: (id: string) => ExportConfig,
  includeRnd = false,
): void { … }
```

`includeRnd` and the `gronthee-rnd-` filename prefix behave exactly as today. The Dishari-config output is byte-equivalent to the current default CSV — verified by an equality test (§4.1).

### 2.7 Sharing & import format

Same JSON shape used for both storage and export:

```json
{
  "id": "library-system-v2",
  "name": "Library System v2",
  "description": "Custom export for the new library import endpoint",
  "columns": [ … ],
  "createdAt": "2026-04-24T10:00:00.000Z",
  "updatedAt": "2026-04-24T10:00:00.000Z"
}
```

- **Share**: download as `gronthee-config-<slug>.json` via Blob URL.
- **Import**: file input → JSON.parse → validate → assign new id (slug from name + suffix if collision) → persist. `builtIn` is stripped on import — imported configs are always editable user configs.
- Validation rejects: missing `name`, missing/empty `columns`, unknown `type`, mapped columns referencing fields outside `BookField` (so R&D fields can't sneak in via import), header longer than 200 chars.

### 2.8 UX notes

- New top-level **Configs** page reachable via header nav (alongside Scan and History).
- List view: card per config (name, description, column count, builtIn badge, action icons: Edit / Clone / Share / Delete). Dishari has only Clone and Share — Edit/Delete suppressed.
- Editor view: header row (name, description); reorderable column list (drag handle); per-row controls (header text input, type dropdown, target field/value input); Add column button; Save / Cancel.
- Session creation moves from inline input in `SessionSelector` to a small **CreateSessionDialog** component because it now needs a name field plus a config dropdown. Inline rename remains in the dropdown.
- Session selector shows the config name as a subtle subtitle for each session (e.g. `Default · 12 books · Library v2`), so users see at a glance which config a session uses.

---

## 3. Implementation Phases

Each phase ends in a working app. Run `npm run lint` and `npm run test:run` after every phase.

### Phase 1 — Data model + Dishari config bundling

**Goal**: Types in place; Dishari config loadable; nothing visible in UI yet.

1. Add `ExportColumnType`, `ExportColumn`, `ExportConfig`, `BookField` types to `src/types/index.ts`.
2. Add `configId: string` to `Session`. Update `useSessions.ts`:
   - `DEFAULT_SESSION` → `configId: 'dishari'`.
   - `createSession(name, configId)` — accept configId param.
   - Migration in `loadSessions`: any session missing `configId` → fill `'dishari'` and re-persist.
3. Create `src/config/dishari-export-config.json` (verbatim shape from §2.2).
4. Add `"resolveJsonModule": true` to `tsconfig.app.json` if not already set; verify the JSON import compiles.

**Acceptance**: existing tests still pass; types compile; sessions migrate transparently.

### Phase 2 — Hook + CSV refactor

**Goal**: CSV generator is config-driven; Dishari config produces byte-identical CSV to today; R&D checkbox + filename prefix continue to work.

1. Create `src/hooks/useExportConfigs.ts`:
   - State: user configs from `gronthee:exportConfigs` (array, default `[]`).
   - Public API: `configs` (built-in Dishari + user, in stable order), `getConfig(id)`, `createConfig({name, description?, columns})`, `updateConfig(id, patch)`, `deleteConfig(id)`, `cloneConfig(id, newName)`.
   - The Dishari built-in is exposed but `update`/`delete` on it are no-ops (returns null/false).
   - `getConfig(id)` falls back to Dishari when the id is unknown.
   - Slug generation reuses `toSlug` (lift it to a shared util `src/utils/slug.ts` so `useSessions` and `useExportConfigs` both import it).
2. Rewrite `src/services/csv.ts`:
   - Drop `HEADERS`, `toRow`. Keep `RND_HEADERS` and `rndRow` (R&D path is unchanged).
   - Add `renderCell` (see §2.6).
   - `exportToCsv(books, filename, config, includeRnd?)` and `exportSessionsToCsv(sessions, books, username, resolveConfig, includeRnd?)`.
   - `defaultCsvFilename(username, includeRnd?)` and `sessionCsvFilename(username, sessionName, includeRnd?)` keep the `includeRnd` parameter and the `gronthee-rnd-` prefix behaviour.
3. Add `src/services/exportConfig.ts`:
   - `validateConfig(input: unknown): ExportConfig | { error: string }`.
   - `serializeForShare(config: ExportConfig): string` (pretty-printed JSON minus localStorage-only metadata if any are added later).
   - `parseImported(json: string): ExportConfig | { error: string }` — runs through `validateConfig`, strips `builtIn`, normalises ids.
4. Add `gronthee:exportConfigs` to the reset list in `AppShell.tsx`.

**Acceptance**: test suite passes; Dishari config CSV equals current output (snapshot equality test — see §4.1); R&D checkbox still produces the existing R&D-suffixed CSV.

### Phase 3 — Configs page + create/edit/delete UI

**Goal**: Users can manage configs via a new top-level page; sessions still implicitly use Default.

1. Add `'configs'` to `Page` in `App.tsx`; thread through `Header.tsx` nav.
2. New folder `src/components/configs/`:
   - `ConfigsPage.tsx` — header (title + "New Config" button + Import button); list of configs.
   - `ConfigCard.tsx` — name, description, column count, builtIn badge, action buttons (Edit/Clone/Share/Delete; Dishari hides Edit/Delete).
   - `ConfigEditor.tsx` — full-page editor:
     - Name (required), Description (optional).
     - Columns list, each row: drag handle, Header input, Type select (Mapped/Constant), then Field dropdown OR Value input depending on type.
     - "Add column" button at end of list.
     - Save (writes via `updateConfig`/`createConfig`) and Cancel buttons.
     - Validation: name required and unique (case-insensitive), at least one column, all headers non-empty, all mapped columns reference a known field.
   - `ColumnRow.tsx` — extracted row component.
   - `ImportConfigDialog.tsx` — file input + parse/validate + preview + Confirm.
3. Drag-and-drop reordering: use a small dependency-free implementation (HTML5 drag-and-drop) or a tiny lib if already available. Keep keyboard accessibility (up/down arrow buttons as fallback).
4. Add `useExportConfigs` to `App.tsx`; pass `configs`, `getConfig`, mutators down to `ConfigsPage`.

**Acceptance**: configs CRUD works end-to-end; Dishari config is read-only; refreshing the page preserves user configs.

### Phase 4 — Session ↔ Config wiring

**Goal**: Each session is tied to a config; new sessions ask the user to pick one; existing sessions transparently use Dishari.

1. `useSessions.createSession(name, configId)` — already updated in Phase 1; defaults to `'dishari'` if not passed (covers tests + safety).
2. New `src/components/shared/CreateSessionDialog.tsx`:
   - Modal opened from `SessionSelector` "+" button.
   - Name input + Config dropdown (defaults to Dishari) + Create / Cancel.
3. Update `SessionSelector.tsx`:
   - Replace inline new-session input with a button that opens `CreateSessionDialog`.
   - Show config name as a subtitle in each session row (look up via passed-in `getConfig`).
4. Update `App.tsx` to thread `getConfig` and configs into `SessionSelector` (already passed where needed).
5. Update existing `SessionSelector.test.tsx` for the new flow (creation now opens a dialog).
6. Keep delete/rename behaviour unchanged. When deleting a *config*, find sessions that reference it and reassign their `configId` to `'dishari'` (mirror of how books are reassigned to Default session).

**Acceptance**: existing sessions still work; new sessions store configId; deleting a config reassigns dependent sessions to Dishari.

### Phase 5 — Export wiring

**Goal**: Exports use each session's config; R&D checkbox is preserved.

1. `ExportSessionDialog`:
   - **Keep** the "Include R&D columns" checkbox — behaviour unchanged.
   - Add a per-session config name label (e.g. `Dishari · 12 books`).
   - Per-row Export button calls `exportSessionsToCsv([session], books, username, getConfig, includeRnd)`.
2. Update `HistoryPage.tsx` to pass `getConfig` down to `ExportSessionDialog`.
3. Update `csv.test.ts` for the new signature (config arg added; `includeRnd` retained).

**Acceptance**: clicking Export for a session uses that session's config; sessions on Dishari produce the same file as before; R&D checkbox still appends the three R&D columns and applies the `gronthee-rnd-` prefix.

### Phase 6 — Share & Import

**Goal**: Round-trip a config between users.

1. Share button on each config card → triggers download of `gronthee-config-<slug>.json`.
2. Import button on Configs page → opens `ImportConfigDialog`:
   - File input accepting `.json`.
   - Parse + validate via `parseImported`.
   - Show name + column count; allow user to rename before confirming (handles slug collisions cleanly).
   - On confirm: insert via `createConfig`.
3. Friendly error messages for malformed files (e.g. "This file isn't a valid Gronthee export config — missing 'columns' field").

**Acceptance**: user A shares a config; user B imports it and uses it on a new session; output CSV matches.

### Phase 7 — Docs + cleanup

1. Update `REQUIREMENTS.md`:
   - Rewrite "CSV Export" section around configurable schemas (Mapped / Constant columns).
   - Keep the "R&D columns" sub-section — checkbox behaviour and `gronthee-rnd-` prefix unchanged.
   - Add a "Configs" section under Data Management (CRUD, share/import, Dishari built-in).
   - Note backward-compatibility: pre-feature sessions/books use Dishari config; pre-feature exports byte-identical.
2. Update `Plan.md` Phase 9:
   - File list for new components, hooks, services.
   - Storage keys table: add `gronthee:exportConfigs`.
   - Decisions log: Dishari built-in (read-only, name fixed), session→config mapping, R&D kept as orthogonal toggle (not part of any config).
3. Verify CLAUDE.md "do not mark complete until REQUIREMENTS.md and Plan.md are updated" rule is honoured.

---

## 4. Test Plan

Place new tests next to the code they cover. Integration tests go under `src/test/integration/`.

### 4.1 CSV equivalence (the critical backward-compat test)

`src/services/csv.test.ts` — **add**:
- `Dishari config produces byte-identical CSV to the old hard-coded format`:
  - Build a fixture array of 3 books with varied content (commas, quotes, empty optional fields, Bengali year, R&D fields populated).
  - Capture the new export's CSV string (mock `Blob` like the existing tests).
  - Compare against an expected string committed to the test (the old `HEADERS` joined with `,` plus rows produced by the old `toRow`). This guarantees no drift.
- `Dishari config + includeRnd=true appends Book ID, Images, Prompt Output and prefixes filename`:
  - Same fixture; expect the three extra columns appended at the end.
  - Images cell contains `JSON.stringify(imageUrls)`; rawAIOutput cell is the raw string.
  - Filename starts with `gronthee-rnd-`.
- `custom config + includeRnd=true also appends R&D columns` — confirms R&D is config-agnostic.
- `mapped column with empty BookMetadata field renders empty string`.
- `constant column always renders the literal value, even with empty value`.
- `unknown field name in a mapped column is rejected at validation time` (negative test — happens in `exportConfig.test.ts`, not in the renderer).

**Keep**: existing R&D-flag tests (updated to pass a config explicitly).

### 4.2 `useExportConfigs.test.ts` (new)

- Exposes the Dishari built-in by default, even with empty localStorage.
- `createConfig` — adds, returns config, persists.
- `updateConfig` — patches, bumps `updatedAt`.
- `updateConfig('dishari', …)` — no-op, returns null.
- `deleteConfig('dishari')` — no-op, returns false.
- `cloneConfig('dishari', 'My Library')` — creates a new editable config with the same columns; `id` is a slug; `builtIn` is false.
- Slug collision: `cloneConfig` twice with same name produces unique ids.
- `getConfig('does-not-exist')` falls back to Dishari.
- Persists to `gronthee:exportConfigs`.

### 4.3 `exportConfig.test.ts` (new — validation/import)

- `parseImported`: valid JSON → returns config; new id assigned; `builtIn` stripped.
- Rejects missing `name`, missing/empty `columns`, unknown column type, header > 200 chars, mapped column with unknown field (including R&D fields like `imageUrls`).
- Round trip: `serializeForShare` → `parseImported` returns equivalent config (modulo id).

### 4.4 `useSessions.test.ts` (update existing)

- Migration: a session loaded from localStorage without `configId` is upgraded to `configId: 'dishari'` and persisted.
- `createSession('Sci-Fi', 'my-config')` stores configId.
- Default session always has `configId: 'dishari'`.
- Deleting a config reassigns affected sessions back to `'dishari'` (this lives in the integration layer / wherever the wiring is — add an integration test for it in §4.7).

### 4.5 Component tests

- `ConfigsPage.test.tsx`: renders Dishari built-in with no Edit/Delete; renders user configs with full action set; clicking "New Config" opens editor with one empty Mapped column scaffold; clicking Delete on a user config calls the mutator.
- `ConfigEditor.test.tsx`: name validation (required, unique); rejects save with empty headers; reordering moves rows; switching a row from Mapped to Constant clears the field/value appropriately; Save calls mutator with the assembled config.
- `CreateSessionDialog.test.tsx`: shows config dropdown defaulting to Dishari; create button disabled until name entered; submit calls `onCreate(name, configId)`.
- `ImportConfigDialog.test.tsx`: malformed JSON shows error; valid file shows preview; rename input feeds into create call.

### 4.6 Update `ExportSessionDialog.test.tsx`

- **Keep** existing R&D checkbox assertions (with new config arg threaded through).
- Assert config name appears next to each session row.
- Per-row Export click calls `exportSessionsToCsv` with the resolved config for that session and the current `includeRnd` value.

### 4.7 Integration — `src/test/integration/export-configs-backward-compat.test.tsx`

This is the load-bearing test for the migration:

- Seed `localStorage` with **only** the legacy keys (sessions w/o configId, books w/o new fields, no `gronthee:exportConfigs`).
- Mount `<App/>`.
- Assert:
  - All sessions now report `configId: 'dishari'`.
  - `getConfig('dishari')` resolves to the bundled Dishari config.
  - Triggering an export from the Default session writes a CSV with the exact pre-feature header row and a row order matching pre-feature output.
  - Triggering an export with the R&D checkbox ticked appends `Book ID`, `Images`, `Prompt Output` and uses the `gronthee-rnd-` filename prefix.
  - User can create a new config, switch a session to it, and export — the resulting CSV reflects the new schema.
  - Deleting that config reassigns the session back to `'dishari'` and a subsequent export uses the Dishari config.

### 4.8 Manual checklist (run before declaring done)

- Fresh user (no localStorage): default behaviour identical to today.
- Existing user upgrading: open History, click Export on Default — the CSV opens correctly in Excel/Google Sheets and matches what they exported yesterday.
- R&D checkbox: tick + Export on Default and on a custom config; verify the three R&D columns are appended in both cases and the `gronthee-rnd-` filename prefix is applied.
- Round-trip a config via Share → Import on a different browser profile.
- Delete a config that 2 sessions reference; both sessions fall back to Dishari with no errors.
- Lint + typecheck + full test run all green.

---

## 5. Files Touched

### New
| Path | Purpose |
|---|---|
| `src/config/dishari-export-config.json` | Bundled Dishari config (the built-in) |
| `src/hooks/useExportConfigs.ts` | Config CRUD + built-in |
| `src/services/exportConfig.ts` | Validation + import/share helpers |
| `src/utils/slug.ts` | Shared slugifier (extracted from useSessions) |
| `src/components/configs/ConfigsPage.tsx` | Top-level configs page |
| `src/components/configs/ConfigCard.tsx` | Card in the list |
| `src/components/configs/ConfigEditor.tsx` | Edit/create form |
| `src/components/configs/ColumnRow.tsx` | One row in the column editor |
| `src/components/configs/ImportConfigDialog.tsx` | Upload + validate + confirm |
| `src/components/shared/CreateSessionDialog.tsx` | Session-creation modal with config picker |
| `src/hooks/useExportConfigs.test.ts` | Hook tests |
| `src/services/exportConfig.test.ts` | Validation tests |
| `src/components/configs/ConfigsPage.test.tsx` | Page tests |
| `src/components/configs/ConfigEditor.test.tsx` | Editor tests |
| `src/components/shared/CreateSessionDialog.test.tsx` | Dialog tests |
| `src/components/configs/ImportConfigDialog.test.tsx` | Import tests |
| `src/test/integration/export-configs-backward-compat.test.tsx` | E2E migration test |

### Modified
| Path | Change |
|---|---|
| `src/types/index.ts` | Add `ExportConfig`/`ExportColumn`/`BookField`; `configId` on Session |
| `src/hooks/useSessions.ts` | Migrate sessions to `configId: 'dishari'`; accept configId on create |
| `src/hooks/useSessions.test.ts` | Cover migration + configId param |
| `src/services/csv.ts` | Config-driven; **keep** `includeRnd` and R&D append path |
| `src/services/csv.test.ts` | Add Dishari-equivalence test; keep R&D-flag tests with new config arg |
| `src/components/shared/SessionSelector.tsx` | Open `CreateSessionDialog`; show config name |
| `src/components/shared/SessionSelector.test.tsx` | Update for new creation flow |
| `src/components/shared/ExportSessionDialog.tsx` | **Keep** R&D checkbox; resolve session's config; show config name per session |
| `src/components/shared/ExportSessionDialog.test.tsx` | Add config-resolution assertions; keep R&D checkbox tests |
| `src/components/layout/Header.tsx` | Add Configs nav item |
| `src/components/layout/AppShell.tsx` | Add `gronthee:exportConfigs` to reset list |
| `src/components/history/HistoryPage.tsx` | Thread `getConfig` to `ExportSessionDialog` |
| `src/App.tsx` | Wire `useExportConfigs`; route to ConfigsPage; thread props |
| `tsconfig.app.json` | Ensure `resolveJsonModule: true` |
| `REQUIREMENTS.md` | Update Export and Sessions sections |
| `Plan.md` | Add Phase 9 — Export Configs |

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Dishari-config CSV drifts from current hard-coded output | The byte-equivalence test in §4.1 fails CI if any column changes. |
| Sessions referencing a deleted config blow up on export | `getConfig(id)` falls back to Dishari; deletion proactively reassigns. |
| Import accepts malicious / oversized JSON | Schema validation + 200-char header cap + reject configs > 200 columns + reject mapped columns referencing fields outside `BookField`. |
| Drag-and-drop is hard to make accessible | Provide keyboard up/down buttons as a fallback; Tab order works without DnD. |

---

## 7. Out of Scope

- Per-book ad-hoc export overrides (always uses session's config).
- Re-running exports across multiple sessions with different configs in one click.
- Computed/templated columns (e.g. concatenated fields) — easy follow-up since the column type is an extensible discriminated union.
- Column-level transformations (uppercase, date format) — same.
- Cloud sync of configs — out of scope; sharing is via download/import for now.

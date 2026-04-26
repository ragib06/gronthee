# Gronthee — Session Management Feature Plan

**Generated:** 2026-04-14
**Updated:** 2026-04-23
**Feature:** Named sessions for book scanning
**Backward compatibility:** Must be transparent to existing users

---

## 1. Goal

Allow users to organise scans into named sessions. Each saved book is associated with the currently active session. Exports can target one or multiple sessions, each producing a separate CSV named after the session.

---

## 2. Design Decisions

### Data Model

**Two-key approach** — flat book list + separate session list (no nesting):

```typescript
// NEW — add sessionId to existing BookMetadata
interface BookMetadata {
  sessionId: string   // NEW field; "default" for all existing books
  id: string
  // ... all existing fields unchanged
}

interface Session {
  id: string           // used as sessionId on books; URL-safe slug
  name: string         // display name (user-facing, can contain spaces)
  createdAt: string    // ISO 8601
}
```

**Why flat over nested:** Books are already in a flat `BookMetadata[]` array in `localStorage`. Nesting them inside sessions would require rewriting `useBookHistory` completely and complicate edit/delete operations. A `sessionId` on each book is a minimal, non-breaking addition.

**Why two keys:** Sessions and books evolve independently — a session can exist with 0 books, and a book always has exactly one session. This keeps CRUD on both sides simple.

### Backward Compatibility

On app startup, before the first render:

1. Load `gronthee:books` from localStorage.
2. If any book has no `sessionId` field → assign `sessionId = 'default'` to each and persist.
3. If `gronthee:sessions` does not exist → seed it with one entry: `{ id: 'default', name: 'Default', createdAt: <now> }`.
4. If `gronthee:currentSessionId` does not exist → set to `'default'`.

**Result for existing users:** Zero action required. All their existing books silently belong to the "Default" session. Everything works exactly as before.

### Session Slug

- `id` = URL-safe slug derived from the user-entered name (lowercase, spaces → hyphens, special chars stripped).
- Uniqueness guaranteed by appending a short random suffix if the slug already exists.
- `name` is the raw user input and is what gets displayed and used in export filenames.

### Last-Used Session Persistence

Store `gronthee:currentSessionId` in localStorage. On every session switch (or on save), update it. On app load, restore it. If the stored session no longer exists (deleted), fall back to `'default'`.

---

## 3. localStorage Keys

| Key | Type | Description |
|---|---|---|
| `gronthee:books` | `BookMetadata[]` | Existing + new books (unchanged — only `sessionId` added to schema) |
| `gronthee:sessions` | `Session[]` | All sessions |
| `gronthee:currentSessionId` | `string` | Active session `id` (never an API key, safe to persist) |
| `gronthee:username` | `string` | Unchanged |
| `gronthee:preferences` | `UserPreferences` | Unchanged |
| `gronthee:selectedModel` | `SelectedModel` | Unchanged |

---

## 4. New Files to Create

| File | Purpose |
|---|---|
| `src/hooks/useSessions.ts` | Session CRUD, active session state, last-used persistence |
| `src/components/shared/SessionSelector.tsx` | Dropdown with session list + inline create + delete |
| `src/components/shared/ExportSessionDialog.tsx` | Multi-select sessions for export |
| `src/components/shared/DeleteSessionDialog.tsx` | Confirm delete session (books reassigned to Default) |

---

## 5. Files to Change

| File | Change |
|---|---|
| `src/types/index.ts` | Add `sessionId` to `BookMetadata`, add `Session` interface |
| `src/hooks/useBookHistory.ts` | Add `sessionId` to `addBook()` signature; filter `books` by `sessionId` in a new `getBooksBySession()` helper |
| `src/services/csv.ts` | Add `exportSessionsToCsv(sessions, books, username)` — one download per session, named `gronthee-<username>-<sessionNameSlug>-<datetime>.csv` |
| `src/components/scanner/ScannerPage.tsx` | Accept `sessionName` prop; display it as a subtitle above the heading |
| `src/components/editor/BookEditorPage.tsx` | Accept `sessionId` prop; render `SessionSelector` dropdown above the Save button |
| `src/components/history/HistoryPage.tsx` | Add session filter chips/tabs above the book list; "All" default |
| `src/components/shared/ExportDialog.tsx` | Replace single-session export with `ExportSessionDialog` (multi-select) |
| `src/components/layout/AppShell.tsx` | Pass `sessionName` down to ScannerPage; pass `sessionId` to BookEditorPage and HistoryPage |
| `src/App.tsx` | Add session state; initialize from localStorage on mount; pass to all pages |

---

## 6. UI / UX Detail

### Frontpage (ScannerPage)
- Heading stays: `"Scan Book"`
- Subtitle/label directly below the heading: `"Session: <sessionName>"` — styled as a small muted pill/badge
- Small "Change" button next to it → opens `SessionSelector`

### SessionSelector Dropdown (BookEditorPage)
- Rendered **above the Save button**, full width, styled as a styled `<select>` or custom dropdown
- Shows current session name, disabled (read-only display — session is chosen before scan)
- A "Change session" button next to it opens the `SessionSelector` modal/dropdown

### SessionSelector (shared component)
- Custom dropdown anchored below a trigger button
- Body: scrollable list of sessions, each showing:
  - `name` (truncated at 30 chars)
  - Book count badge in muted text: `(12 books)`
  - A checkmark on the active session
  - Pencil icon (visible on hover) — click enables inline rename; `default` session is excluded
  - Trash icon (visible on hover) — click shows `DeleteSessionDialog`; `default` session is excluded
- Footer: inline text input + "Create" button to add a new session
  - Enter key or button click creates
  - Empty input is rejected (button disabled)
  - Name uniqueness is validated client-side (case-insensitive)
  - Input is disabled if 50-session limit is reached, with a tooltip explanation

### DeleteSessionDialog
- Triggered from the trash icon on a session row in `SessionSelector`
- Cannot delete the `default` session — button/row is hidden for it
- Confirm text: "Delete session `<name>`? This session has 12 books. They will be moved to Default. This cannot be undone."
- On confirm: find all books with this `sessionId`, set their `sessionId` to `'default'`, then remove the session from `gronthee:sessions`
- Books are never deleted or orphaned — they always live under some session

### Export Flow (ExportSessionDialog)
- Replaces the existing `ExportDialog`
- Checklist of all sessions (not a single-select dropdown)
- Each session shows name + book count
- "Select all" / "Deselect all" toggle
- "Export" button generates one CSV per selected session, each named:
  `gronthee-<username>-<sessionNameSlug>-<datetime>.csv`
- The existing `defaultCsvFilename()` utility is NOT used for this; new function `sessionCsvFilename(username, sessionName, datetime)` returns the session-specific name.
- If only one session is selected → single download (same as today, just better named)
- If zero selected → Export button disabled

### HistoryPage Filter
- Horizontal chip/tab row at the top: "All", then one chip per session
- Active chip highlighted (filled vs outlined)
- Shows only books belonging to the selected session
- Switching session does NOT change URL or app state — just a local filter

---

## 7. Step-by-Step Implementation Plan

### Step 1 — Types + Storage foundation
1. Add `sessionId: string` to `BookMetadata` in `src/types/index.ts`
2. Add `Session` interface to `src/types/index.ts`
3. Create `src/hooks/useSessions.ts`:
   - Load/save `gronthee:sessions` and `gronthee:currentSessionId`
   - `sessions: Session[]` state
   - `currentSession: Session` derived (find by `currentSessionId`, fallback to default)
   - `createSession(name): Session | null` — generates slug (max 50 chars), checks uniqueness, checks 50-session cap, persists; returns `null` if limit reached
   - `renameSession(id, newName): void` — updates session name; guarded against renaming `'default'`
   - `deleteSession(id)` — reassigns books to "default" first, then removes session; guarded against deleting `'default'`
   - `setCurrentSession(id)` — updates `currentSessionId` in localStorage
   - `sessionCount: number` — exported as a derived value to gate the create UI
   - On mount: seed "Default" session if missing; seed `currentSessionId` if missing

### Step 2 — BookHistory integration
4. Update `useBookHistory`:
   - `addBook(book, sessionId)` — attach `sessionId` on every save
   - `getBooksBySession(sessionId): BookMetadata[]` — filter helper
   - On load: for each book with no `sessionId`, assign `'default'` and persist back

### Step 3 — ScannerPage session display
5. Pass `sessionName` to `ScannerPage` from `App.tsx`
6. Add `"Session: <name>"` badge + "Change" button in `ScannerPage` heading area
7. "Change" opens `SessionSelector` modal

### Step 4 — BookEditorPage session dropdown
8. Pass `sessionId` to `BookEditorPage` from `App.tsx`
9. Add `SessionSelector` component rendered above the Save button (read-only display + Change button)

### Step 5 — HistoryPage session filter
10. Pass `sessions` and `currentSessionId` to `HistoryPage`
11. Add session filter chips above the book list
12. `getBooksBySession()` used to filter

### Step 6 — Export with multi-session support
13. Create `src/components/shared/ExportSessionDialog.tsx`
14. Replace `ExportDialog` usage in `HistoryPage` with `ExportSessionDialog`
15. Update `src/services/csv.ts` — add `sessionCsvFilename()` and update export logic

### Step 7 — App.tsx wiring
16. Initialise `useSessions()` hook in `App.tsx`
17. Pass `sessions`, `currentSession`, `setCurrentSession` to all child pages

### Step 8 — Backward compatibility verification
18. Test: fresh load with existing books (no `sessionId`) — should auto-assign to Default
19. Test: existing `gronthee:books` with `sessionId: "default"` on all entries — no migration needed
20. Test: export with Default session — produces same CSV format as before

---

## 8. Testing

### Test Setup

The project has no test runner yet. Add **Vitest** + **React Testing Library**, which integrate natively with the existing Vite + TypeScript stack:

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add to `vite.config.ts`:

```typescript
/// <reference types="vitest" />
export default defineConfig({
  // ...existing config...
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run"
```

---

### Unit Tests — `useSessions` hook (`src/hooks/useSessions.test.ts`)

| Test | Description |
|---|---|
| Seeds Default session on first load | Fresh localStorage → `sessions` contains exactly one `{ id: 'default', name: 'Default' }` entry |
| Restores sessions from localStorage | Pre-seeded `gronthee:sessions` → hook loads them correctly |
| `createSession` happy path | Creates session, assigns slug, persists to localStorage, returns `Session` object |
| `createSession` duplicate name | Case-insensitive name collision → returns `null`, state unchanged |
| `createSession` at 50-session cap | 50 sessions already exist → returns `null`, state unchanged |
| `createSession` slug collision | Same slug from two different names → second gets random suffix appended |
| `renameSession` happy path | Session name updated in state and localStorage |
| `renameSession` on default | Calling `renameSession('default', ...)` is a no-op |
| `deleteSession` reassigns books | All books with deleted `sessionId` get `sessionId = 'default'` |
| `deleteSession` on default | Calling `deleteSession('default')` is a no-op |
| `setCurrentSession` persists | `gronthee:currentSessionId` updated in localStorage |
| Falls back to default if currentSessionId missing | Stored ID no longer in sessions list → `currentSession` resolves to Default |
| `sessionCount` reflects state | Returns correct count after create and delete |

---

### Unit Tests — `useBookHistory` hook (`src/hooks/useBookHistory.test.ts`)

| Test | Description |
|---|---|
| Migration: books without `sessionId` | On load, books missing `sessionId` are assigned `'default'` and persisted |
| Migration: books already have `sessionId` | No re-write to localStorage; values preserved as-is |
| `addBook` attaches `sessionId` | Book saved with the provided `sessionId` |
| `getBooksBySession` filters correctly | Returns only books matching the given `sessionId` |
| `getBooksBySession('default')` returns migrated books | Books that were migrated all appear under Default |

---

### Unit Tests — CSV service (`src/services/csv.test.ts`)

| Test | Description |
|---|---|
| `sessionCsvFilename` format | Returns `gronthee-<username>-<slug>-<datetime>.csv` |
| `sessionCsvFilename` special chars in name | Spaces and special chars stripped/slugified in filename |
| `exportSessionsToCsv` one session | Triggers one download with correct filename and book rows |
| `exportSessionsToCsv` multiple sessions | Triggers one download per session |
| `exportSessionsToCsv` empty session | Zero-book session exports a header-only CSV (not skipped) |
| CSV column order unchanged | All existing fields appear in the same column order as before |

---

### Unit Tests — Slug utility (inline in `useSessions.test.ts` or `slug.test.ts`)

| Test | Description |
|---|---|
| Lowercase conversion | `"My Books"` → `"my-books"` |
| Space → hyphen | `"Summer 2025"` → `"summer-2025"` |
| Special char stripping | `"Rägib's!"` → `"rgib-s"` (or similar, no crashes) |
| Max length enforcement | Input > 50 chars is truncated before suffix appended |
| Empty string input | Returns a fallback slug (e.g. `"session"`) rather than empty string |

---

### Component Tests — `SessionSelector` (`src/components/shared/SessionSelector.test.tsx`)

| Test | Description |
|---|---|
| Renders session list | All session names visible after opening dropdown |
| Shows book count badge | Each row shows correct `(N books)` count |
| Checkmark on active session | Active session row has checkmark indicator |
| Create new session | Type name + click Create → new session appears in list |
| Create disabled on empty input | Create button is disabled when input is blank |
| Create disabled at 50-session cap | Input field and button disabled with tooltip when at limit |
| Rename session inline | Click pencil → input appears pre-filled; Enter saves new name |
| Rename does not appear on Default | Pencil icon absent on the `default` session row |
| Delete icon triggers dialog | Click trash → `DeleteSessionDialog` shown with correct session name |
| Delete does not appear on Default | Trash icon absent on the `default` session row |

---

### Component Tests — `DeleteSessionDialog` (`src/components/shared/DeleteSessionDialog.test.tsx`)

| Test | Description |
|---|---|
| Shows book count in confirm text | "This session has N books. They will be moved to Default." |
| Confirm triggers reassignment | On confirm, books reassigned and session removed from state |
| Cancel closes dialog, no state change | Clicking Cancel leaves sessions and books unchanged |

---

### Component Tests — `ExportSessionDialog` (`src/components/shared/ExportSessionDialog.test.tsx`)

| Test | Description |
|---|---|
| Lists all sessions with book counts | Each session row renders name + count |
| Export button disabled when none selected | No sessions checked → button disabled |
| Select all / Deselect all toggle | Toggles all checkboxes |
| Export triggers download per session | Two sessions selected → two download calls |
| Single session selected → single download | One CSV produced |

---

### Component Tests — `HistoryPage` filter chips (`src/components/history/HistoryPage.test.tsx`)

| Test | Description |
|---|---|
| "All" chip shown and active by default | First chip is "All" and is highlighted |
| Session chips rendered | One chip per session (excluding "All") |
| Filtering by session chip | Clicking a chip hides books from other sessions |
| "All" shows every book | Clicking "All" after filtering restores full list |

---

### Integration / Backward Compatibility Tests

These run against the full `App` component with a mocked localStorage:

| Test | Description |
|---|---|
| Fresh app load, no existing data | Default session created; scanner shows "Session: Default" |
| Existing books without `sessionId` | All books appear under Default session in HistoryPage |
| Existing books with `sessionId` | Books grouped correctly under their sessions |
| Session persists across remount | Active session restored after component unmount + remount |
| Export of Default session matches old format | CSV columns and data identical to pre-session export output |

---

### Test File Locations

```
src/
  hooks/
    useSessions.test.ts
    useBookHistory.test.ts
  services/
    csv.test.ts
  components/
    shared/
      SessionSelector.test.tsx
      DeleteSessionDialog.test.tsx
      ExportSessionDialog.test.tsx
    history/
      HistoryPage.test.tsx
  test/
    setup.ts
    integration/
      sessions-backward-compat.test.tsx
```

---

## 9. Files Summary

**New files (10):**
- `src/hooks/useSessions.ts`
- `src/hooks/useSessions.test.ts`
- `src/hooks/useBookHistory.test.ts`
- `src/components/shared/SessionSelector.tsx`
- `src/components/shared/SessionSelector.test.tsx`
- `src/components/shared/ExportSessionDialog.tsx`
- `src/components/shared/ExportSessionDialog.test.tsx`
- `src/components/shared/DeleteSessionDialog.tsx`
- `src/components/shared/DeleteSessionDialog.test.tsx`
- `src/services/csv.test.ts`
- `src/components/history/HistoryPage.test.tsx`
- `src/test/setup.ts`
- `src/test/integration/sessions-backward-compat.test.tsx`

**Modified files (9):**
- `src/types/index.ts`
- `src/hooks/useBookHistory.ts`
- `src/services/csv.ts`
- `src/components/scanner/ScannerPage.tsx`
- `src/components/editor/BookEditorPage.tsx`
- `src/components/history/HistoryPage.tsx`
- `src/components/shared/ExportDialog.tsx` (replaced by ExportSessionDialog — delete after migration)
- `src/components/layout/AppShell.tsx`
- `src/App.tsx`
- `vite.config.ts` (add Vitest config)
- `package.json` (add test scripts + devDependencies)

---

## 10. Risks & Tradeoffs

| Risk | Mitigation |
|---|---|
| Session name slug collision | Random suffix appended on collision; names are unique by display, not by slug |
| Many sessions with few books each | No hard limit; UI chips may get crowded — cap display at ~15 chips with horizontal scroll |
| Existing CSV exports break | Unlikely — book schema is additive; export function unchanged except filename |
| "Default" session accidentally deleted | Guard: cannot delete `id === 'default'` in `deleteSession()` |
| Sessionless books (future edge case) | Always default to `currentSessionId` on save; books without `sessionId` always treated as Default |

---

## 11. Design Decisions Finalized

1. **Session rename supported** — each session row has a pencil/rename icon (visible on hover). Clicking enables inline edit of the session name. Enter or blur saves; Escape cancels. `default` session is NOT renameable.
2. **Max session name: 50 characters** — enforced in the create and rename inputs.
3. **"Ending" a session requires no special UI** — user simply switches to a different session; the old one stops receiving new books. No explicit end action.
4. **On session delete: books reassigned to Default** — confirm dialog shows book count: "This session has 12 books. They will be moved to Default. Continue?" Books are never orphaned.
5. **Max 50 sessions total** — if user is at 50 sessions, the "Create new session" input is disabled with a tooltip: "Maximum of 50 sessions reached." `default` session counts toward this limit.
6. **HistoryPage chips capped at ~15 before horizontal scroll** — prevents overcrowding when many sessions exist.
7. **No change to the username greeting on the frontpage** — existing greeting remains.

---

## 12. Suggested Implementation Order

```
1.  Types + useSessions hook (foundation)
2.  useBookHistory update (add sessionId to saves)
3.  App.tsx wiring (state plumbing)
4.  SessionSelector component
5.  ScannerPage session badge
6.  BookEditorPage session dropdown
7.  HistoryPage session filter chips
8.  ExportSessionDialog + CSV update
9.  Test setup (Vitest + RTL install + vite.config update)
10. Unit tests — useSessions, useBookHistory, csv, slug
11. Component tests — SessionSelector, DeleteSessionDialog, ExportSessionDialog, HistoryPage
12. Integration tests — backward compat, session persistence
13. End-to-end manual test with existing localStorage data
14. Update REQUIREMENTS.md + Plan.md
```

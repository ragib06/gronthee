# Gronthee — Implementation Plan

## 1. Project Structure (Directory Tree)

```
gronthee/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── vite-env.d.ts
│   │
│   ├── config/
│   │   └── ai-config.ts              # Provider list, model list; reads API keys from import.meta.env
│   │
│   ├── types/
│   │   └── index.ts                  # All TypeScript interfaces and enums
│   │
│   ├── constants/
│   │   └── mappings.ts               # Collection codes, Item Type codes, label→code and code→label maps
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── index.ts              # Dispatcher: routes to correct provider
│   │   │   ├── anthropic.ts          # Claude provider adapter
│   │   │   ├── openai.ts             # GPT provider adapter
│   │   │   └── gemini.ts             # Gemini provider adapter
│   │   ├── storage.ts                # localStorage read/write helpers
│   │   └── csv.ts                    # CSV generation + download
│   │
│   ├── hooks/
│   │   ├── useBookHistory.ts         # CRUD on book history in localStorage
│   │   ├── useUserPreferences.ts     # Learning corrections from localStorage
│   │   └── useAIConfig.ts            # Read selected provider/model; resolves API key from import.meta.env
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Top nav, sidebar shell
│   │   │   └── Header.tsx            # Logo, nav links, model selector
│   │   │
│   │   ├── scanner/
│   │   │   ├── ScannerPage.tsx       # Top-level scan page
│   │   │   ├── DropZone.tsx          # react-dropzone wrapper
│   │   │   ├── WebcamCapture.tsx     # react-webcam wrapper + capture button
│   │   │   ├── ImagePreview.tsx      # Thumbnail grid for selected images
│   │   │   └── ModelSelector.tsx     # Provider + model dropdown
│   │   │
│   │   ├── editor/
│   │   │   ├── BookEditorPage.tsx    # Full page: preview + form
│   │   │   ├── BookForm.tsx          # All metadata fields form
│   │   │   ├── FormField.tsx         # Reusable labeled input/select
│   │   │   └── ScanDateField.tsx     # Read-only date display
│   │   │
│   │   ├── history/
│   │   │   ├── HistoryPage.tsx       # Book list + search/filter
│   │   │   ├── BookCard.tsx          # Card for one book entry
│   │   │   └── BookDetailModal.tsx   # Full detail modal/drawer
│   │   │
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBanner.tsx
│   │       ├── SuccessBanner.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── ExportDialog.tsx
│   │       ├── UsernameDialog.tsx        # First-launch username prompt
│   │       └── ResetDialog.tsx           # Destructive reset confirmation
│   │
│   └── utils/
│       ├── applyPreferences.ts       # Apply stored corrections to raw AI output
│       ├── dateUtils.ts              # YYYY-MM-DD helpers
│       └── imageToBase64.ts          # File/Blob → base64 helper
│
├── .env.local                        # Local API keys (gitignored); copy from .env.example
├── .env.example                      # Example env vars committed to repo (no real keys)
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── postcss.config.js
├── .gitignore
└── package.json
```

---

## 2. Phases

---

### Phase 1 — Project Setup

**Goal**: Working Vite + React + TypeScript scaffold with all dependencies installed and configured.

**Tasks**:

1. Scaffold with Vite: `npm create vite@latest gronthee -- --template react-ts`
2. Install dependencies:
   ```
   npm install tailwindcss @tailwindcss/vite lucide-react motion react-webcam react-dropzone
   npm install @anthropic-ai/sdk openai @google/generative-ai
   npm install -D @types/node
   ```
3. Configure Tailwind CSS v4 via `@tailwindcss/vite` plugin in `vite.config.ts`
4. Create `tailwind.config.ts` with custom theme tokens (font, colors, border-radius)
5. Set up `tsconfig.json` with `"paths"` alias (`@/` → `src/`)
6. Create `.gitignore` — include `.env.local` and `node_modules`; `ai-config.json` is committed (no secrets — API keys come from env vars)
7. Write `.env.example` with placeholder values (`VITE_ANTHROPIC_API_KEY=`, `VITE_OPENAI_API_KEY=`, `VITE_GEMINI_API_KEY=`)
8. Bootstrap `src/main.tsx` and blank `src/App.tsx`

**Files to create**:

| File | Purpose |
|---|---|
| `vite.config.ts` | Vite config with Tailwind plugin and `@` path alias |
| `tailwind.config.ts` | Design tokens |
| `tsconfig.json` | TS compiler options |
| `.env.example` | Env var template (no real keys) |
| `.gitignore` | Ignore secrets and build output |
| `src/main.tsx` | React root mount |
| `src/App.tsx` | Router shell (placeholder) |

---

### Phase 2 — Core Components

**Goal**: All UI components built with dummy/static data, routing wired up, animations in place.

**Tasks**:

1. Define all TypeScript interfaces in `src/types/index.ts`
2. Define all code mappings in `src/constants/mappings.ts`
3. Build `AppShell` + `Header` with nav links
4. Build `ScannerPage` skeleton (tabs: Upload / Webcam)
   - `DropZone` using react-dropzone
   - `WebcamCapture` using react-webcam
   - `ImagePreview` thumbnail grid
   - `ModelSelector` dropdown (reads from config)
5. Build `BookEditorPage` with `BookForm`
   - All 21 metadata fields rendered
   - `FormField` reusable component (input, textarea, select, read-only); accepts `error` prop — shows red border + inline error message below the field
   - Required fields validated on save: title, author, publisher, publishedYear, isbn, category, genre, collection, itemType, pageCount, language, edition, publicationPlace, summary. Optional: subTitle, otherTitle, secondAuthor, editor, translator, illustrator. Save is blocked and all empty required fields are highlighted simultaneously; each error clears as the user fills in that field. On failed save, a red error banner appears below the last field instructing the user to fill in all highlighted fields; banner disappears on a successful save.
   - `category` is a free-text field; AI pre-fills it as "Fiction" or "Non Fiction" but the user can override
   - `ScanDateField` for the non-editable date
   - Image thumbnail grid: `grid-cols-2`, `max-w-[240px]` on mobile to keep thumbnails compact (~120px each); `md:max-w-none` on desktop
   - Zoom modal: 4 zoom steps (1×, 1.5×, 2×, 3×) via bottom toolbar; tap image to toggle 1×↔2×; scrollable at zoom > 1×; zoom badge top-left; resets on close
6. Build `HistoryPage` + `BookCard` + `BookDetailModal`
7. Add `LoadingSpinner`, `ErrorBanner`, `SuccessBanner`, `ConfirmDialog`, `UsernameDialog` (shown on first launch when no username in localStorage; stores result under `gronthee-username`), `ResetDialog` (destructive reset confirmation, red CTA, lists all data that will be erased)
   - `ScannerPage` receives `username` prop and displays `"Welcome, <username>"` as a small subtitle above the page heading
8. Add a "Reset all data" footer link in `AppShell` — opens `ResetDialog`; on confirm clears `gronthee-username`, `gronthee:books`, `gronthee:preferences` from localStorage and calls `window.location.reload()`
8. Wire client-side routing using a single `activePage` state in `App.tsx` (values: `'scan' | 'editor' | 'history'`) — avoids React Router dependency for a 3-screen app
9. Apply Motion animations (page transitions, card entrance, spinner)

**Component notes**:

- `ModelSelector` reads the provider/model list from `src/config/ai-config.ts` (static config, no secrets). It renders a two-level dropdown: Provider → Model. The selected `{provider, modelId}` is held in React state at `App.tsx` level and passed down via props or a small React context. The API key for the selected provider is resolved at scan time from `import.meta.env` (e.g., `import.meta.env.VITE_ANTHROPIC_API_KEY`).
- `BookForm` fields use `Collection` and `ItemType` dropdowns populated from `src/constants/mappings.ts`.
- `ScanDateField` displays `new Date().toISOString().slice(0, 10)` and is visually distinct (grey background, lock icon).
- All animations use `motion/react`. Page transitions use `AnimatePresence` + `motion.div`. Cards use staggered `initial/animate/exit` variants.

---

### Phase 3 — AI Integration

**Goal**: Images sent to selected AI provider; structured metadata returned and auto-corrected by user preferences.

**Tasks**:

1. Write `src/config/ai-config.ts` — defines static provider/model list; resolves API keys from `import.meta.env` (`VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`); exports typed `AIConfig` and helpers
2. Write provider adapters:
   - `src/services/ai/anthropic.ts`
   - `src/services/ai/openai.ts`
   - `src/services/ai/gemini.ts`
3. Write `src/services/ai/index.ts` — dispatcher that selects adapter by `provider` string
4. Write `src/utils/imageToBase64.ts` — converts `File` objects to base64 strings
5. Write the AI extraction prompt (see Section 5)
6. Write `src/utils/applyPreferences.ts` — applies stored `{original → corrected}` maps to raw AI JSON
7. Wire scan flow in `ScannerPage`: collect images → call dispatcher → show loading → receive metadata → navigate to `BookEditorPage` pre-filled
8. Implement error handling: API errors, malformed JSON, rate limits

**Provider adapter contract** — each adapter must export:

```typescript
export async function extractBookMetadata(
  images: Base64Image[],
  modelId: string,
  apiKey: string
): Promise<Partial<BookMetadata>>
```

Where `Base64Image` is `{ data: string; mimeType: string }`.

**Response parsing strategy**: Each adapter sends the prompt, asks for a JSON response, then uses a shared `parseAIResponse(raw: string): Partial<BookMetadata>` util that strips markdown fences, parses JSON, validates field types, and **reverse-maps human-readable `collection` and `itemType` values back to their codes** using the lookup maps in `src/constants/mappings.ts` (e.g., `"Fiction"` → `"FIC"`, `"Book"` → `"BK"`). If the returned value doesn't match any known label, the field is set to `""`.

---

### Phase 4 — Data Management

**Goal**: localStorage persistence for books and user preferences, CSV export.

**Tasks**:

1. Write `src/services/storage.ts` — typed `get/set/update/remove` wrappers over `localStorage`
2. Write `src/hooks/useBookHistory.ts` — exposes `{ books, addBook, updateBook, deleteBook }`
3. Write `src/hooks/useUserPreferences.ts` — exposes `{ preferences, recordCorrection, applyPreferences }`
4. Integrate preference recording: in `BookForm`, on save compare final field values vs original AI values; if different, call `recordCorrection(fieldName, original, corrected)`
5. Write `src/services/csv.ts` — serialize `BookMetadata[]` to CSV string, trigger download via Blob URL. `exportToCsv(books, filename)` accepts a filename (appends `.csv` if missing). `defaultCsvFilename(username)` returns `gronthee-<username>-<yyyy-mm-dd-hh-mm-ss>.csv`. All metadata fields including Summary are included in CSV output.
6. Wire "Save" button in `BookEditorPage` → `addBook` → navigate to history
7. Wire "Export CSV" button in `HistoryPage` → opens `ExportDialog` with editable filename pre-filled to `gronthee-<username>-<yyyy-mm-dd-hh-mm-ss>.csv` → on confirm calls `exportToCsv`
8. Wire "Delete" in `HistoryPage` → `deleteBook` with `ConfirmDialog`
9. Wire edit flow: clicking a book in `HistoryPage` opens `BookEditorPage` in edit mode → `updateBook`

---

### Phase 5 — Polish and Export

**Goal**: Production-ready quality, responsiveness, accessibility, edge cases.

**Tasks**:

1. Responsive layout audit (mobile-first breakpoints for `BookForm` two-column grid, `HistoryPage` card grid, `ScannerPage` header stacks title above model selector on mobile)
2. Add search and sort to `HistoryPage` (filter by title/author, sort by scan date)
3. Loading state improvements (skeleton screens for `BookCard` list)
4. Webcam: check `window.isSecureContext` upfront — show "HTTPS required" immediately if false (camera API blocked over plain HTTP on non-localhost); otherwise mount `<Webcam>` to trigger browser permission prompt; distinguish `NotAllowedError`/`SecurityError` (denied), `NotFoundError` (no camera), and other errors (in use); Retry remounts `<Webcam>` via `retryKey` with a 50 ms delay to ensure the loading state renders first; on mobile phones (`/Android.*Mobile|iPhone|iPod/i`) use `facingMode: { ideal: 'environment' }` (back camera) via `videoConstraints`; desktops and tablets default to `facingMode: 'user'` (front camera)
5. Image upload: validate file types (JPEG, PNG, WEBP) and size limit (max 25 MB per image)
6. Multi-image support: AI adapters must encode all selected images and pass them as an array (up to 4: cover, title page, copyright page, back cover)
7. Accessibility: `aria-label` on icon buttons, `htmlFor`/`id` on all form fields, keyboard navigation for modal
8. Error boundary at App root
9. Final animation polish: success flash on save
10. Build and verify production output: `npm run build && npm run preview`

---

## 3. Key Architectural Decisions

### Routing Strategy
Use a single `activePage` state in `App.tsx` (values: `'scan' | 'editor' | 'history'`) plus an `activeBook` state to pass the current book to the editor. This avoids adding React Router for what is effectively a 3-screen app, reduces bundle size, and keeps state flow simple.

### AI Config Loading
Provider and model definitions are declared as a static TypeScript constant in `src/config/ai-config.ts`. API keys are read at runtime from Vite environment variables (`import.meta.env.VITE_ANTHROPIC_API_KEY`, etc.) — they are never bundled into source. For local development, keys go in `.env.local` (gitignored). For production, they are set as Vercel environment variables in the Vercel dashboard or via `vercel env add`. Only `.env.example` (with empty placeholder values) is committed to the repo.

### State Management
No Redux or Zustand. App state is small enough for:
- `App.tsx` — page routing, selected model
- `useBookHistory` hook — localStorage books
- `useUserPreferences` hook — localStorage corrections
- Component-level state for form values, images, loading/error

### Multi-Image Encoding
All provider adapters accept an array of base64 images. Claude, Gemini, and GPT-4o all natively support multiple image inputs in a single message.

---

## 4. TypeScript Interfaces and Data Models

### `src/types/index.ts`

```typescript
export type CollectionCode =
  | 'ART' | 'BIO' | 'CHI' | 'COLL' | 'CRI'
  | 'FIC' | 'HYST' | 'MYTH' | 'MISC' | 'NFIC'
  | 'PLAY' | 'POET' | 'REF' | 'SCIFI' | 'SPI'
  | 'SPO' | 'TRVL' | 'COOK' | 'MUSC' | 'ESSY';

export type ItemTypeCode = 'BK' | 'ASB' | 'RB' | 'REF' | 'MG';

export type AIProvider = 'anthropic' | 'openai' | 'gemini';

export interface BookMetadata {
  id: string;                  // uuid generated at save time via generateId() (falls back to Math.random for non-secure HTTP contexts)
  title: string;
  subTitle: string;
  otherTitle: string;
  author: string;
  secondAuthor: string;
  editor: string;
  translator: string;
  illustrator: string;
  publisher: string;
  publishedYear: string;       // YYYY
  isbn: string;
  category: string;
  genre: string;
  collection: CollectionCode | '';
  itemType: ItemTypeCode | '';
  pageCount: string;
  language: string;            // ISO 639-1, e.g. "en"
  edition: string;
  publicationPlace: string;
  scanDate: string;            // YYYY-MM-DD, auto, non-editable
  summary: string;
}

// Shape of the JSON object returned directly by the AI.
// collection and itemType are human-readable strings here (e.g. "Fiction", "Book").
// parseAIResponse() maps these to codes before producing BookMetadata.
export interface AIRawResponse {
  title: string;
  subTitle: string;
  otherTitle: string;
  author: string;
  secondAuthor: string;
  editor: string;
  translator: string;
  illustrator: string;
  publisher: string;
  publishedYear: string;
  isbn: string;
  category: string;
  genre: string;
  collection: string;   // human-readable label, e.g. "Fiction"
  itemType: string;     // human-readable label, e.g. "Book"
  pageCount: string;
  language: string;
  edition: string;
  publicationPlace: string;
  summary: string;
}

// Validated AI output after code mapping; excludes auto-generated fields
export type RawBookMetadata = Omit<BookMetadata, 'id' | 'scanDate'>;

export interface ModelDefinition {
  id: string;           // e.g. "claude-opus-4-5"
  label: string;        // e.g. "Claude Opus 4.5"
}

export interface ProviderConfig {
  provider: AIProvider;
  label: string;
  apiKey: string;
  models: ModelDefinition[];
}

export interface AIConfig {
  defaultProvider: AIProvider;
  defaultModelId: string;
  providers: ProviderConfig[];
}

export interface SelectedModel {
  provider: AIProvider;
  modelId: string;
  apiKey: string;
}

// Key: fieldName → { originalValue → correctedValue }
export interface UserPreferences {
  corrections: Record<string, Record<string, string>>;
}

export interface Base64Image {
  data: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}
```

### localStorage Keys

| Key | Type | Description |
|---|---|---|
| `gronthee:books` | `BookMetadata[]` | All saved book records |
| `gronthee:preferences` | `UserPreferences` | Per-field correction maps |
| `gronthee-username` | `string` | Username entered at first launch |

---

## 5. AI Prompt Design

The prompt is a constant in `src/services/ai/prompt.ts`, shared across all provider adapters.

```
You are a book cataloging assistant. You will be given one or more images of a book
(cover, title page, copyright page, or back cover). Extract the book's metadata and
return it as a single JSON object.

CRITICAL RULES:
1. ALL output values MUST be in English. If the book is in another language, translate
   titles, summaries, publisher names, author names (transliterate if needed), and all
   other text fields into English.
2. Return ONLY a raw JSON object — no markdown fences, no commentary, no explanation.
3. If a field cannot be determined from the images, use an empty string "".
4. The "language" field is the ISO 639-1 code of the book's ORIGINAL language in ALL CAPS
   (e.g., "EN", "BN", "FR", "AR") — this is the one field that is NOT translated.
5. For "publishedYear", return only a 4-digit year string (e.g., "2019") or "".
6. For "pageCount", return only a numeric string (e.g., "312") or "".
7. For "collection", return one of these exact human-readable values or "":
   Art, Biography, Children, Collection, Literary Criticism, Fiction, History,
   Mythology, Miscellaneous, Non-Fiction, Play, Poetry, Reference, Science Fiction,
   Spiritual, Sports, Travel, Cook, Music, Essay
8. For "itemType", return one of these exact human-readable values or "":
   Book, Author Signed Book, Rare Book, Reference, Magazine
9. For "summary", write 1-2 sentences in English describing the book's subject matter.
10. For "edition", use ordinal form: "1st", "2nd", "3rd", etc., or "".
11. For "publicationPlace", return the city name only — do not include country or state (e.g., "New York", not "New York, USA").

Return this exact JSON structure:
{
  "title": "",
  "subTitle": "",
  "otherTitle": "",
  "author": "",
  "secondAuthor": "",
  "editor": "",
  "translator": "",
  "illustrator": "",
  "publisher": "",
  "publishedYear": "",
  "isbn": "",
  "category": "",
  "genre": "",
  "collection": "",
  "itemType": "",
  "pageCount": "",
  "language": "",
  "edition": "",
  "publicationPlace": "",
  "summary": ""
}
```

### Provider-Specific Encoding

**Anthropic (Claude)**:
- Messages API; images as `{ type: "image", source: { type: "base64", media_type, data } }` content blocks
- Prompt text as a final `{ type: "text", text: PROMPT }` content block
- `max_tokens: 1024`

**OpenAI (GPT)**:
- Chat Completions API; images as `{ type: "image_url", image_url: { url: "data:<mimeType>;base64,<data>" } }` content parts
- Prompt as `{ type: "text", text: PROMPT }` in the same user message

**Google (Gemini)**:
- `@google/generative-ai` SDK; images as `InlineDataPart`: `{ inlineData: { mimeType, data } }`
- Call `model.generateContent([...imageParts, promptText])`

---

## 6. Environment Variables & Config

### `.env.example` (committed to repo — no real keys)

```
VITE_ANTHROPIC_API_KEY=
VITE_OPENAI_API_KEY=
VITE_GEMINI_API_KEY=
```

Developers copy this to `.env.local` and fill in their keys. In production, these are set as Vercel environment variables via the Vercel dashboard or `vercel env add`.

### `src/config/ai-config.ts` (static provider/model list)

This file contains no secrets. It declares the provider and model options, and resolves API keys from `import.meta.env` at runtime:

```typescript
import type { AIConfig } from '@/types';

export const AI_CONFIG: AIConfig = {
  defaultProvider: 'anthropic',
  defaultModelId: 'claude-opus-4-5',
  providers: [
    {
      provider: 'anthropic',
      label: 'Anthropic',
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
      models: [
        { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
        { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
        { id: 'claude-haiku-3-5', label: 'Claude Haiku 3.5' },
      ],
    },
    {
      provider: 'openai',
      label: 'OpenAI',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
      models: [
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      ],
    },
    {
      provider: 'gemini',
      label: 'Google Gemini',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '',
      models: [
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      ],
    },
  ],
};

export function getProviderConfig(provider: string) {
  return AI_CONFIG.providers.find(p => p.provider === provider);
}

export function resolveModel(provider: string, modelId: string) {
  return getProviderConfig(provider)?.models.find(m => m.id === modelId);
}
```

---

## 7. User Preference Learning

### Storage (`gronthee:preferences`)

```json
{
  "corrections": {
    "publisher": {
      "Harper and Row": "Harper & Row"
    },
    "author": {
      "García Márquez, Gabriel": "Gabriel Garcia Marquez"
    },
    "collection": {
      "NFIC": "FIC"
    }
  }
}
```

### Apply on Scan (`src/utils/applyPreferences.ts`)

After AI response is parsed and before the form is shown: for each field, check if `preferences.corrections[fieldName][rawValue]` exists; if so, replace with stored correction.

### Record on Save (`src/hooks/useUserPreferences.ts`)

At save time, compare each field's final form value against `originalAIOutput` (held in component state). For any field where `formValue !== originalValue && originalValue !== ''`, call `recordCorrection(fieldName, originalValue, formValue)`.

---

## 8. Implementation Sequence Summary

```
Phase 1 — Setup           Scaffold, install, configure tooling
Phase 2 — UI Components   All pages and components with static/mock data
Phase 3 — AI Integration  Provider adapters, prompt, scan flow wired end-to-end
Phase 4 — Data Layer      localStorage persistence, preferences, CSV export
Phase 5 — Polish          Responsiveness, accessibility, error handling, animations
```

### Critical Files (must exist before dependent work can proceed)

- `.env.example` + `src/config/ai-config.ts` — gates `ModelSelector` and all AI integration work
- `src/types/index.ts` — every other file depends on these types
- `src/services/ai/index.ts` — the dispatcher and shared prompt
- `src/hooks/useBookHistory.ts` — required before save/history/export features
- `src/hooks/useUserPreferences.ts` — must be wired into both form (recording) and dispatcher (applying)

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
│   │   │   ├── ScannerPage.tsx       # Top-level scan page; persists tab choice ('scanner-tab' in localStorage); 3-min inactivity timer auto-reverts webcam tab to upload
│   │   │   ├── DropZone.tsx          # react-dropzone wrapper
│   │   │   ├── WebcamCapture.tsx     # react-webcam wrapper + capture button; auto-scrolls feed into view on ready (window.scrollTo, offset -60); max-h-[52vh] w-auto feed, w-fit container
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
│   │       ├── UsernameDialog.tsx        # First-launch username prompt (whitespace stripped from input)
│   │       ├── PagesDialog.tsx           # Pre-scan popup to enter page count (skippable); uses visualViewport API to avoid keyboard overlap on mobile
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
   - `FormField` reusable component (input, textarea, select, read-only); accepts `error` prop — shows red border + inline error message below the field; required fields with an empty value show an amber (`bg-amber-50`) background immediately on load
   - Required fields validated on save: title, author, publisher, publishedYear, isbn, category, genre, collection, itemType, pageCount, language, edition, publicationPlace, summary. Optional: subTitle, otherTitle, secondAuthor, editor, translator, illustrator. Save is blocked and all empty required fields are highlighted simultaneously; each error clears as the user fills in that field. On failed save, a red error banner appears below the last field instructing the user to fill in all highlighted fields; banner disappears on a successful save.
   - `category` is a dropdown with fixed options: "Fiction", "Non-Fiction", "Miscellaneous"
   - `genre` is a dropdown with 56 fixed options (Agriculture, Analytical Essays, Art, … Workbook)
   - Both `category` and `genre` are validated against their option sets in `initForm`; AI values that don't exactly match an option are reset to `''`, forcing the user to select
   - ISBN is sanitized at parse time: dashes are stripped (e.g. `978-3-16-148410-0` → `9783161484100`); empty value defaults to `N/A`
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

- `ModelSelector` reads the provider/model list from `src/config/ai-config.ts` (static config, no secrets). It renders a two-level dropdown: Provider → Model. The selected `{provider, modelId}` is held in React state at `App.tsx` level and passed down via props. The API key for the selected provider is resolved at scan time from `import.meta.env`. **The selection is persisted to `localStorage` under `gronthee:selectedModel`** (only `provider` and `modelId` — no API key) and restored on next load via `loadSavedModel()` in `App.tsx`, falling back to `getDefaultModel()` if the saved value is absent or invalid.
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
   - `src/services/ai/openrouter.ts` (OpenAI-compatible, baseURL: `https://openrouter.ai/api/v1`)
3. Write `src/services/ai/index.ts` — dispatcher that selects adapter by `provider` string
4. Write `src/utils/imageToBase64.ts` — converts `File` objects to base64 strings
5. Write the AI extraction prompt (see Section 5)
6. Write `src/utils/applyPreferences.ts` — applies stored `{original → corrected}` maps to raw AI JSON
7. Wire scan flow in `ScannerPage`: collect images → click Scan Book → show `PagesDialog` (skippable, pre-AI) → user submits page count → show loading → call dispatcher → receive metadata → merge page count → navigate to `BookEditorPage` pre-filled
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
5. Write `src/services/csv.ts` — serialize `BookMetadata[]` to CSV string, trigger download via Blob URL. `exportToCsv(books, filename)` accepts a filename (appends `.csv` if missing). `defaultCsvFilename(username)` returns `gronthee-<username>-<yyyy-mm-dd-hh-mm-ss>.csv`. All metadata fields including Summary are included in CSV output. `Collection` and `Item Type` export the raw abbreviated codes (e.g. `FIC`, `BK`) not the human-readable labels.
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

export interface Session {
  id: string;        // URL-safe slug; 'default' for the built-in session
  name: string;      // Display name (user-facing)
  createdAt: string; // ISO 8601
}

export interface BookMetadata {
  id: string;                  // uuid generated at save time via generateId() (falls back to Math.random for non-secure HTTP contexts)
  sessionId: string;           // session this book belongs to; 'default' for legacy books
  title: string;
  subTitle: string;
  otherTitle: string;
  author: string;
  secondAuthor: string;
  editor: string;
  translator: string;
  illustrator: string;
  publisher: string;
  publishedYear: string;       // YYYY (Gregorian)
  publishedYearBengali: string; // Bengali era year e.g. "1407", derived if not on book
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
  id: string;           // e.g. "claude-opus-4-6"
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
| `gronthee:books` | `BookMetadata[]` | All saved book records (each has `sessionId`) |
| `gronthee:preferences` | `UserPreferences` | Per-field correction maps |
| `gronthee-username` | `string` | Username entered at first launch |
| `gronthee:selectedModel` | `{provider, modelId}` | Last-used AI provider and model (API key excluded) |
| `gronthee:sessions` | `Session[]` | All named sessions (always includes Default; each has `configId`) |
| `gronthee:currentSessionId` | `string` | Active session id; falls back to `'default'` if missing |
| `gronthee:exportConfigs` | `ExportConfig[]` | User-created export configs (Dishari built-in never persisted here) |

---

## 5. AI Prompt Design

The prompt is a constant in `src/services/ai/prompt.ts`, shared across all provider adapters.

```
You are a book cataloging assistant. You will be given one or more images of a book
(cover, title page, copyright page, or back cover). Extract the book's metadata and
return it as a single JSON object.

CRITICAL RULES:
1. ALL output values MUST be in English or romanised/transliterated form. Translate
   summaries, publisher names, author names (transliterate if needed), and all other
   text fields into English. EXCEPTION — see rule 13 for title fields.
13. "title" always uses the title as it appears on the book (romanised if non-Latin).
    English translation goes in "otherTitle" only. Never put a translation in "title".
2. Return ONLY a raw JSON object — no markdown fences, no commentary, no explanation.
3. If a field cannot be determined from the images, use an empty string "".
4. The "language" field is the ISO 639-1 code of the book's ORIGINAL language in ALL CAPS
   (e.g., "EN", "BN", "FR", "AR") — this is the one field that is NOT translated.
5. For "publishedYear" (Gregorian YYYY) and "publishedYearBengali" (Bengali era, e.g. "1407"):
   if multiple years appear (multiple editions), always pick the LATEST.
   Convert between Gregorian and Bengali using ±593. Fill both whenever at least one is determinable.
6. For "pageCount", return only a numeric string (e.g., "312") or "".
7. For "collection", return one of these exact human-readable values or "":
   Art, Biography, Children, Collection, Literary Criticism, Fiction, History,
   Mythology, Miscellaneous, Non-Fiction, Play, Poetry, Reference, Science Fiction,
   Spiritual, Sports, Travel, Cook, Music, Essay
8. For "itemType", return one of these exact human-readable values or "":
   Book, Author Signed Book, Rare Book, Reference, Magazine
9. For "summary", write 1-2 sentences in English describing the book's subject matter.
10. For "edition", use ordinal form: "1st", "2nd", "3rd", etc., or "". Only consider edition/publication dates — ignore impression, print run, and reprint dates. If multiple editions, return the highest (latest) one.
11. For "publicationPlace", return the city name only — do not include country or state (e.g., "New York", not "New York, USA").
12. For "publisher": on Bengali books, use the name listed under প্রকাশক (publisher) — NOT পরিবেশক (distributor). If both appear, always use প্রকাশক.

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
  "publishedYearBengali": "",
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
VITE_OPENROUTER_API_KEY=
VITE_CLOUDFLARE_ACCOUNT_ID=
VITE_CLOUDFLARE_R2_ACCESS_KEY_ID=
VITE_CLOUDFLARE_R2_API_KEY=
VITE_CLOUDFLARE_R2_BUCKET_NAME=
VITE_CLOUDFLARE_R2_PUBLIC_URL=
```

Developers copy this to `.env.local` and fill in their keys. In production, these are set as Vercel environment variables via the Vercel dashboard or `vercel env add`.

### `src/config/ai-config.ts` (static provider/model list)

This file contains no secrets. It declares the provider and model options, and resolves API keys from `import.meta.env` at runtime:

```typescript
import type { AIConfig } from '@/types';

export const AI_CONFIG: AIConfig = {
  defaultProvider: 'anthropic',
  defaultModelId: 'claude-opus-4-6',
  providers: [
    {
      provider: 'anthropic',
      label: 'Anthropic',
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
      models: [
        { id: 'claude-opus-4-6', label: 'Claude Opus 4.5' },
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
        { id: 'gemma-4-31b-it', label: 'Gemma 4 31B' },
      ],
    },
    {
      provider: 'openrouter',
      label: 'OpenRouter',
      apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? '',
      models: [
        { id: 'qwen/qwen3.6-plus:free', label: 'Qwen 3.6 Plus' },
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
    "author": {
      "Humayan Ahmed": "Humayun Ahmed"
    }
  }
}
```

Only the `author` field is tracked. Corrections for other fields are ignored.

### Apply on Scan (`src/utils/applyPreferences.ts`)

After AI response is parsed and before the form is shown: check if `preferences.corrections['author'][rawAuthorValue]` exists; if so, replace with stored correction. Only the `author` field is applied.

### Record on Save (`src/hooks/useUserPreferences.ts`)

At save time, compare the final `author` form value against the original AI-extracted value. Save the correction only if:
1. Both values are non-empty and different
2. `levenshtein(original, corrected) / original.length <= 0.3` (≤ 30% of characters changed)

---

## 8. Implementation Sequence Summary

```
Phase 1 — Setup           Scaffold, install, configure tooling
Phase 2 — UI Components   All pages and components with static/mock data
Phase 3 — AI Integration  Provider adapters, prompt, scan flow wired end-to-end
Phase 4 — Data Layer      localStorage persistence, preferences, CSV export
Phase 5 — Polish          Responsiveness, accessibility, error handling, animations
Phase 6 — Sessions        Named session management (implemented 2026-04-23)
Phase 7 — Image Storage   Cloudflare R2 upload on save (implemented 2026-04-23)
```

---

## 9. Phase 6 — Sessions (implemented 2026-04-23)

**Goal**: Allow users to organise scanned books into named sessions with per-session CSV export.

### New files
| File | Purpose |
|---|---|
| `src/hooks/useSessions.ts` | Session CRUD, slug generation, localStorage persistence, 50-session cap |
| `src/components/shared/SessionSelector.tsx` | Floating dropdown: list, create, inline rename, delete trigger |
| `src/components/shared/DeleteSessionDialog.tsx` | Confirm delete; shows book count; reassigns books to Default |
| `src/components/shared/ExportSessionDialog.tsx` | Per-row Export button per session; no checkboxes; Cancel-only footer |
| `src/hooks/useSessions.test.ts` | Unit tests for useSessions hook + toSlug utility |
| `src/hooks/useBookHistory.test.ts` | Unit tests for migration and sessionId handling |
| `src/services/csv.test.ts` | Unit tests for sessionCsvFilename and exportSessionsToCsv |
| `src/components/shared/SessionSelector.test.tsx` | Component tests |
| `src/components/shared/DeleteSessionDialog.test.tsx` | Component tests |
| `src/components/shared/ExportSessionDialog.test.tsx` | Component tests |
| `src/components/history/HistoryPage.test.tsx` | Session filter chip tests |
| `src/test/setup.ts` | Vitest + RTL setup |
| `src/test/integration/sessions-backward-compat.test.tsx` | Backward compat + session persistence tests |

### Modified files
| File | Change |
|---|---|
| `src/types/index.ts` | Added `Session` interface; added `sessionId` to `BookMetadata`; updated `RawBookMetadata` to omit `sessionId` |
| `src/hooks/useBookHistory.ts` | Migration on load; added `reassignBooksToSession()`, `getBooksBySession()` |
| `src/services/csv.ts` | Added `sessionCsvFilename()`, `exportSessionsToCsv()` |
| `src/components/editor/BookForm.tsx` | `onSave` type excludes `sessionId` |
| `src/components/editor/BookEditorPage.tsx` | Accepts `currentSessionId`; attaches it on add; preserves it on update |
| `src/components/scanner/ScannerPage.tsx` | Session badge + `SessionSelector` below heading |
| `src/components/history/HistoryPage.tsx` | Session filter chips; replaced `ExportDialog` with `ExportSessionDialog` |
| `src/components/layout/AppShell.tsx` | Session keys added to reset list |
| `src/App.tsx` | Wires `useSessions`; passes session props to all pages; `handleDeleteSession` combines reassign + delete |
| `vite.config.ts` | Added Vitest config block |
| `package.json` | Added `test`, `test:ui`, `test:run` scripts; added Vitest + RTL devDependencies |

### Design decisions
- **Flat storage**: `sessionId` on each book, not books nested inside sessions — minimal migration, non-breaking
- **Default session**: `id = 'default'`; always present; cannot be renamed or deleted; existing books auto-migrated to it
- **50-session cap**: Create input disabled with tooltip when at limit
- **Session delete**: Books never orphaned — always moved to Default; guarded at hook level (`id === 'default'` is a no-op)
- **Export**: Per-row Export button in the dialog; each click downloads that session's CSV immediately without closing the dialog. No checkboxes or bulk-select. Downloads are staggered 300 ms apart (browser blocks simultaneous programmatic clicks). Filename uses session name slug: `gronthee-<username>-<sessionSlug>-<datetime>.csv`
- **Active session label**: On the Review & Save page (new book only), "Active session: `<name>`" is shown right-aligned below the Save button so users can confirm the target session before saving

---

## 10. Phase 7 — Image Storage / Cloudflare R2 (implemented 2026-04-23)

**Goal**: Compress and upload scanned images to Cloudflare R2 on save; store public URLs in `BookMetadata`.

### New files
| File | Purpose |
|---|---|
| `src/services/imageCompression.ts` | Canvas-based JPEG compression (max 1200 px, quality 0.8) |
| `src/services/r2Storage.ts` | Compress + upload images to R2 via `aws4fetch`; returns public URLs |

### Modified files
| File | Change |
|---|---|
| `src/types/index.ts` | Added `imageUrls?: string[]` to `BookMetadata` |
| `src/hooks/useUserPreferences.ts` | Updated cast to `Record<string, unknown>` to accommodate `imageUrls` array field |
| `src/components/editor/BookEditorPage.tsx` | Awaits R2 upload before `onAdd`; passes `isSaving` to `BookForm`; shows amber warning on partial upload failure |
| `src/components/editor/BookForm.tsx` | Added `isSaving` prop; Save button shows spinner + "Uploading…" during upload; Cancel disabled during upload |
| `package.json` | Added `aws4fetch` dependency |

### Design decisions
- **Upload on save (add only)**: Upload happens when a new book is saved; edits preserve existing `imageUrls` unchanged
- **File path**: `{bookId}/{index}.jpg` — 1-based index, always JPEG regardless of input format
- **Parallel uploads**: All images for a book are uploaded concurrently via `Promise.all`
- **Non-blocking failure**: Partial or total upload failure shows an amber warning; book is always saved (with whatever URLs succeeded)
- **Silent degradation**: If credentials are not configured (e.g. local dev without `.env.local`), upload is skipped with no error
- **No CSV column by default**: Image URLs are not in the default CSV (format matches an external library system). See Phase 8 — image URLs are available via the optional R&D columns.
- **No R2 delete on book delete**: Deferred; can be added as a cleanup feature later
- **Env vars**: `VITE_CLOUDFLARE_ACCOUNT_ID`, `VITE_CLOUDFLARE_R2_ACCESS_KEY_ID`, `VITE_CLOUDFLARE_R2_API_KEY` (secret key), `VITE_CLOUDFLARE_R2_BUCKET_NAME`, `VITE_CLOUDFLARE_R2_PUBLIC_URL` (bucket's `pub-xxxxx.r2.dev` public URL)

### Critical Files (must exist before dependent work can proceed)

- `.env.example` + `src/config/ai-config.ts` — gates `ModelSelector` and all AI integration work
- `src/types/index.ts` — every other file depends on these types
- `src/services/ai/index.ts` — the dispatcher and shared prompt
- `src/hooks/useBookHistory.ts` — required before save/history/export features
- `src/hooks/useUserPreferences.ts` — must be wired into both form (recording) and dispatcher (applying)

---

## 11. Phase 8 — R&D Export Columns (implemented 2026-04-24)

**Goal**: Let users optionally include three research-oriented columns in the CSV export (Book ID, Images, raw AI prompt output) for data-quality analysis, without changing the default export shape that matches the external library system.

### Modified files
| File | Change |
|---|---|
| `src/types/index.ts` | Added `rawAIOutput?: string` to `BookMetadata` |
| `src/services/ai/parse.ts` | `ParsedAIResponse` now includes `raw: string` — the exact AI response text, returned alongside parsed metadata |
| `src/App.tsx` | Added `pendingRawAIOutput?: string` to `EditorParams`; threaded through to `BookEditorPage` |
| `src/components/scanner/ScannerPage.tsx` | Captures `raw` from `extractBookMetadata` and forwards it via navigate |
| `src/components/editor/BookEditorPage.tsx` | Accepts `pendingRawAIOutput`; persists it on `onAdd`; preserves existing `rawAIOutput` on edit |
| `src/services/csv.ts` | Added `includeRnd` option (default `false`) to `exportToCsv` + `exportSessionsToCsv`; appends `Book ID`, `Images`, `Prompt Output` columns when true; filename helpers prefix with `gronthee-rnd-` in R&D mode |
| `src/components/shared/ExportSessionDialog.tsx` | Added "Include R&D columns" checkbox (unchecked by default); resets each time dialog opens; passed through to `exportSessionsToCsv` |

### Design decisions
- **Opt-in, unchecked default**: Base CSV shape unchanged so it stays compatible with the external library system. R&D data is appended only when explicitly requested.
- **Images column format**: JSON-encoded array of URLs (e.g. `["…/1.jpg","…/2.jpg"]`). Empty string when no URLs. CSV escape handles the inner quotes.
- **Prompt Output**: the JSON body returned by the AI, with markdown fences (```` ```json ```` / ```` ``` ````) and any leading/trailing prose stripped so the cell starts with `{` and ends with `}`. Not re-serialised — the internal structure/whitespace is preserved.
- **Raw AI output captured in `parse.ts`**: parse already receives the text and already strips fences for JSON parsing — returning the cleaned form avoids touching any of the four provider files.
- **Edit preserves raw output**: Editing an existing book keeps its original `rawAIOutput`; it's only set during initial save from the scan flow.
- **Checkbox state resets per-open**: opening the dialog always starts with the box unchecked.

### Tests
- `src/services/csv.test.ts` — default export excludes R&D headers; `includeRnd=true` appends the three columns with correct encoding; empty cells for pre-feature books.
- `src/components/shared/ExportSessionDialog.test.tsx` — updated existing tests for the new 4th argument; added coverage for checking the R&D box and confirming `includeRnd=true` flows through.

---

## 12. Phase 9 — Export Configs (complete; all 7 phases of plan_export_configs.md landed 2026-04-25)

**Goal**: Replace the single hard-coded CSV export shape with user-defined configs. Each session points to a config via `configId`; the bundled `dishari` config preserves backward compatibility byte-for-byte.

**Status**: All 7 phases of `temp_plans/plan_export_configs.md` landed.
- Phase 1 — data model + Dishari bundle
- Phase 2 — `useExportConfigs` hook + config-driven `csv.ts` (Dishari output is byte-equivalent to pre-feature)
- Phase 3 — Configs page (CRUD UI), card list, full-page editor with reorderable column list, import dialog scaffold
- Phase 4 — Session ↔ config wiring: new `CreateSessionDialog` (name + config dropdown), `SessionSelector` shows config name as a subtitle and opens the dialog from a "New session" button instead of the old inline input, deleting a config reassigns dependent sessions to `'dishari'` before removal
- Phase 5 — Export wiring: `ExportSessionDialog` now resolves each session's config via the `getConfig` callback threaded down from `App` → `HistoryPage`; per-session config name is shown as a subtitle in the dialog; the R&D checkbox is preserved and continues to append `Book ID, Images, Prompt Output` and the `gronthee-rnd-` filename prefix regardless of which config the session uses
- Phase 6 — Share & Import polish: `parseImported` error messages now user-friendly with Gronthee-branded prefix; Share test added to `ConfigsPage.test.tsx`; integration test `export-configs-backward-compat.test.tsx` covers migration, config lookup, custom-config export, config deletion cascade, and R&D flag orthogonality
- Phase 7 — Docs cleanup: REQUIREMENTS.md CSV Export section rewritten around per-session config-driven export; localStorage key table updated with `gronthee:exportConfigs`

### New files (cumulative through Phase 6)
| File | Purpose |
|---|---|
| `src/config/dishari-export-config.json` | Bundled Dishari config (built-in, id reserved) |
| `src/hooks/useExportConfigs.ts` | Config CRUD; merges bundled built-in with user configs |
| `src/services/exportConfig.ts` | `validateConfig`, `parseImported`, `serializeForShare`, `DISHARI_CONFIG`, `ALL_BOOK_FIELDS` |
| `src/utils/slug.ts` | Shared slugifier (lifted from `useSessions`) |
| `src/components/configs/ConfigsPage.tsx` | Top-level Configs page; routes between list and editor |
| `src/components/configs/ConfigCard.tsx` | Card per config; hides Edit/Delete on the built-in |
| `src/components/configs/ConfigEditor.tsx` | Create/edit form with name, description, ordered column list |
| `src/components/configs/ColumnRow.tsx` | One column row: header input, type select, field/value control, drag handle, up/down buttons, delete |
| `src/components/configs/ImportConfigDialog.tsx` | File-input dialog with preview, rename, validation error surface |
| `src/hooks/useExportConfigs.test.ts` | Hook tests |
| `src/services/exportConfig.test.ts` | Validation + import/share tests |
| `src/components/configs/ConfigsPage.test.tsx` | List + dialog interactions + Share download test (Phase 6) |
| `src/components/configs/ConfigEditor.test.tsx` | Form + validation + reorder tests |
| `src/components/configs/ImportConfigDialog.test.tsx` | Parse/validate/preview/import flow |
| `src/components/shared/CreateSessionDialog.tsx` | Modal dialog: name input + config dropdown; replaces the inline new-session input |
| `src/components/shared/CreateSessionDialog.test.tsx` | Tests for the create-session dialog |
| `src/test/integration/export-configs-backward-compat.test.tsx` | Integration: migration, config lookup, custom export, config-deletion cascade, R&D flag (Phase 6) |

### Modified files (cumulative through Phase 6)
| File | Change |
|---|---|
| `src/types/index.ts` | Added `ExportConfig`, `ExportColumn`, `BookField`, `ExportColumnType`; added `configId: string` to `Session` |
| `src/hooks/useSessions.ts` | Migration upgrades pre-feature sessions to `configId: 'dishari'` and persists; `createSession(name, configId?)` accepts optional configId, defaulting to `'dishari'`; new `reassignSessionsConfig(from, to)` for use when a config is deleted |
| `src/services/csv.ts` | Config-driven: `exportToCsv(books, filename, config, includeRnd?)` and `exportSessionsToCsv(sessions, books, username, resolveConfig, includeRnd?)`; Dishari output remains byte-equivalent |
| `src/components/shared/ExportSessionDialog.tsx` | Phase 5: takes a `getConfig` prop and threads it as the `resolveConfig` callback so each session exports with its own config; shows config name as a subtitle in each row; R&D checkbox behaviour unchanged |
| `src/components/history/HistoryPage.tsx` | Phase 5: accepts `getConfig` prop and threads it down to `ExportSessionDialog` |
| `src/components/history/HistoryPage.test.tsx` | Phase 5: tests pass a `getConfig` mock |
| `src/components/shared/ExportSessionDialog.test.tsx` | Phase 5: added config-subtitle assertion and per-row export-with-correct-getConfig test; existing R&D checkbox tests continue to pass with the new signature |
| `src/components/shared/SessionSelector.tsx` | Replaced inline new-session input with a "New session" button that opens `CreateSessionDialog`; shows config name as a subtitle on each session row; new `configs` and `getConfig` props |
| `src/components/shared/SessionSelector.test.tsx` | Updated for the dialog-based create flow and config-subtitle assertion |
| `src/components/scanner/ScannerPage.tsx` | Threads `configs` and `getConfig` to `SessionSelector`; `onCreateSession` now takes `(name, configId)`; shows active session's config name inline next to session name in header |
| `src/components/layout/Header.tsx` | New `Configs` nav item alongside Scan and History |
| `src/components/layout/AppShell.tsx` | `gronthee:exportConfigs` added to the reset-all key list |
| `src/App.tsx` | Wired `useExportConfigs`; routes the new `'configs'` page; `handleDeleteConfig` reassigns dependent sessions to `'dishari'` before deletion; threads `getConfig` to `HistoryPage` |

### Design decisions (carried over from `temp_plans/plan_export_configs.md`)
- **Dishari built-in is read-only**: cannot be edited or deleted; users clone it as a starting point for new configs. The bundled JSON is the single source of truth — never persisted to localStorage.
- **R&D columns stay orthogonal**: the "Include R&D columns" checkbox continues to append `Book ID`, `Images`, `Prompt Output` after whatever columns the session's config produces, regardless of which config is selected. R&D fields are intentionally excluded from `BookField` so they cannot leak into a Mapped column.
- **Session → config by id (not inline)**: editing a config affects every session that references it (intuitive: typo fixes propagate). Deleting a config reassigns dependent sessions to Dishari (mirror of the books-fall-back-to-Default-on-session-delete pattern).
- **Slug + collision handling**: ids are URL-safe slugs from name; collisions append a random 4-char suffix.
- **Validation cap**: max 200 columns per config; max 200-char header per column; max name length 80 (UI-enforced) — keeps imports bounded.
- **Imports always become user configs**: `parseImported` strips `builtIn` so a shared file can never overwrite the bundled Dishari record.
- **DnD with keyboard fallback**: HTML5 drag/drop powers reordering; up/down arrow buttons cover keyboard users without pulling in a DnD library.

---

## 13. Phase 10 — Supabase Backend: Auth + Books (Phase 1 + 2a, implemented 2026-04-25)

**Goal**: Move book data and auth to Supabase. Books read/write from `public.books`; auth via Supabase magic-link. `LocalStorageMigrationDialog` migrates existing localStorage books on first login.

### New / modified files
| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase JS client (anon key, public) |
| `src/lib/supabase-types.ts` | Generated DB types |
| `src/lib/db-mappers.ts` | `toBookRow` / `fromBookRow` — camelCase ↔ snake_case |
| `src/hooks/useAuth.ts` | `useAuth()` — Supabase magic-link sign-in/out |
| `src/hooks/useBookHistory.ts` | Rewritten: fetch/add/update/delete via Supabase `books` table |
| `src/components/shared/LocalStorageMigrationDialog.tsx` | One-time localStorage → Supabase import dialog |
| `src/App.tsx` | Wired `useAuth`; shows login page until authenticated; shows migration dialog after first login |

---

## 14. Phase 11 — Supabase Backend: Sessions (Phase 2b, implemented 2026-04-26)

**Goal**: Sessions read/write from Supabase `public.sessions`. Completes the core data layer migration.

### New / modified files
| File | Change |
|---|---|
| `src/lib/db-mappers.ts` | Added `toSessionRow` / `fromSessionRow` |
| `src/hooks/useSessions.ts` | Accepts `userId: string \| null`; Supabase path when provided (fetch + optimistic mutations); localStorage path when null (unchanged — all prior tests continue to pass) |
| `src/components/shared/LocalStorageMigrationDialog.tsx` | Migrates non-default sessions alongside books; `hasPendingMigration` now triggers on sessions too; UI shows combined count |
| `src/App.tsx` | Passes `user?.id ?? null` to `useSessions` |
| `src/hooks/useSessions.test.ts` | Added `vi.mock('@/lib/supabase')`; added 7 Supabase-mode tests (`waitFor` pattern) |
| `src/test/integration/sessions-backward-compat.test.tsx` | Added `vi.mock('@/lib/supabase')` |
| `src/test/integration/export-configs-backward-compat.test.tsx` | Added `vi.mock('@/lib/supabase')` |

### Design decisions
- **Dual-mode hook**: `useSessions(userId?)` operates in localStorage mode when `userId` is null (auth loading or unauthenticated) and switches to Supabase when `userId` is provided. The `useEffect([userId])` loads from DB; the `useState` lazy initializer still seeds from localStorage for the null case so all 221 prior tests are unaffected.
- **`currentSessionId` stays in localStorage**: it is UI state, not data — no server round-trip needed.
- **Default session upserted on first DB fetch**: if no sessions exist for the user, `DEFAULT_SESSION` is upserted so the invariant "at least one session always exists" holds server-side.
- **Optimistic mutations with rollback**: `createSession` adds to state immediately and rolls back on DB error; `renameSession` / `deleteSession` / `reassignSessionsConfig` fire-and-forget (no rollback needed for these).
- **Migration dialog extended**: upserts non-default sessions before books; clears both `gronthee:sessions` and `gronthee:books` keys on success.
- **Friendly import errors (Phase 6)**: `parseImported` wraps validation errors with a Gronthee-branded prefix ("This file isn't a valid Gronthee export config — …") so users get actionable messages rather than internal technical strings.

## 15. Phase 12 — Supabase Backend: Export Configs + Preferences (Phase 3, implemented 2026-04-26)

**Goal**: Export configs and user preferences (author correction maps) persist in Supabase across devices. Completes the full data-layer migration.

### Files changed

| File | Change |
|------|--------|
| `src/lib/db-mappers.ts` | Added `toConfigRow`/`fromConfigRow`, `toPrefsRow`/`fromPrefsRow` |
| `src/hooks/useExportConfigs.ts` | Rewritten: accepts `userId`; Supabase `export_configs` table; Dishari built-in stays bundled; optimistic mutations with rollback |
| `src/hooks/useUserPreferences.ts` | Rewritten: accepts `userId`; loads from `user_preferences` on mount; `recordCorrections` upserts via Supabase |
| `src/utils/applyPreferences.ts` | Removed `loadPreferences` (no longer needed); `applyPreferences` kept as pure function |
| `src/components/scanner/ScannerPage.tsx` | Accepts `preferences: UserPreferences` prop; removed direct `loadPreferences()` call |
| `src/components/editor/BookEditorPage.tsx` | Accepts `onRecordCorrections` prop; removed `useUserPreferences` hook call |
| `src/components/layout/AppShell.tsx` | Accepts `userId`; Reset now deletes `export_configs` + `user_preferences` Supabase rows; localStorage keys trimmed to `currentSessionId`, `selectedModel`, `migrated` |
| `src/App.tsx` | Wires `useUserPreferences(userId)` centrally; passes `preferences` to ScannerPage and `recordCorrections` to BookEditorPage; passes `userId` to AppShell and `useExportConfigs` |
| `src/hooks/useExportConfigs.test.ts` | Rewritten with Supabase mock; removed localStorage persistence tests |
| `src/test/integration/export-configs-backward-compat.test.tsx` | Updated mock setup; all `useExportConfigs()` calls pass `USER_ID` |

### Design decisions
- **Preferences centralized in App.tsx**: `useUserPreferences(userId)` called once at the top; `preferences` passed as prop to `ScannerPage` and `recordCorrections` passed to `BookEditorPage`. Avoids two separate Supabase fetches per page render.
- **Sync optimistic API preserved**: `createConfig`, `updateConfig`, `deleteConfig`, `cloneConfig` return synchronously (optimistic) and fire Supabase ops fire-and-forget with rollback on error. `ConfigsPage` props interface unchanged.
- **Reset deletes configs + prefs from Supabase**: books and sessions remain in Supabase on reset (consistent with Phase 2 behavior — reset clears local cache and signs out, not a full data purge). Export configs and preferences are cleared since they replace what was previously cleared from localStorage.
- **localStorage keys**: after Phase 3, only `gronthee:currentSessionId`, `gronthee:selectedModel`, and `gronthee:migrated` remain as meaningful localStorage keys.

## 16. Phase 13 — AI Proxy Edge Function (Phase 4, implemented 2026-04-26)

**Goal**: AI API keys (Anthropic, Gemini, OpenRouter) never leave Vercel. Scanning routes through a server-side Edge Function with JWT auth.

### Files changed

| File | Change |
|------|--------|
| `api/scan.ts` | **New** — Vercel Edge Function; verifies Supabase JWT; routes to Anthropic/OpenAI/Gemini/OpenRouter with streaming SSE response |
| `api/cron/keepalive.ts` | **New** — Vercel cron handler skeleton; Supabase SELECT to prevent free-tier pause (auth hardening landed in Phase 15) |
| `src/services/ai/proxy.ts` | **New** — client-side proxy; fetches `/api/scan` with Bearer token; reads SSE stream; returns `ParsedAIResponse` |
| `src/services/ai/index.ts` | Replaced 4 provider imports with `extractViaProxy` |
| `src/services/ai/anthropic.ts` | **Deleted** — logic moved into `api/scan.ts` |
| `src/services/ai/openai.ts` | **Deleted** |
| `src/services/ai/gemini.ts` | **Deleted** |
| `src/services/ai/openrouter.ts` | **Deleted** |
| `src/config/ai-config.ts` | Removed `getApiKey()` and all `VITE_*_API_KEY` reads; `resolveModel`/`getDefaultModel` no longer include `apiKey` |
| `src/types/index.ts` | Removed `apiKey` from `SelectedModel` interface |
| `tsconfig.api.json` | **New** — TypeScript config for `api/` (ES2023 + DOM + Node types) |
| `tsconfig.json` | References `tsconfig.api.json` |
| `eslint.config.js` | Added `api/**` block with Node globals |
| `.env.local` | Removed `VITE_ANTHROPIC_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_OPENROUTER_API_KEY`; added `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (server-side, no `VITE_` prefix) |

### Design decisions
- **Edge Function streaming**: AI provider responses are streamed as SSE (`data: {"text":"…"}\n\n`) terminated by `data: [DONE]\n\n`. Avoids Vercel Hobby 10s timeout on large responses.
- **JWT auth via Supabase `getUser(token)`**: Edge Function creates a Supabase client with the anon key and verifies the Bearer token. Ensures only authenticated users can trigger AI calls.
- **Proxy collects all SSE chunks then calls `parseAIResponse`**: UI scanning flow is unchanged — `extractBookMetadata` still returns a `Promise<ParsedAIResponse>`. Streaming in the proxy is an implementation detail.
- **`SelectedModel.apiKey` removed**: no longer needed since keys live server-side. `resolveModel` and `getDefaultModel` return `{ provider, modelId }` only.
- **Local dev**: use `vercel dev` to run Edge Functions locally (reads `.env.local`). `npm run dev` alone won't execute `/api/scan`.

## 17. Phase 14 — R2 Presigned Upload (Phase 5, implemented 2026-04-26)

**Goal**: Cloudflare R2 credentials never reach the browser. The browser still uploads images directly to R2 (no proxy of image bytes through Vercel) by using short-lived presigned `PUT` URLs minted by a server function.

### Files changed

| File | Change |
|------|--------|
| `api/r2/presign.ts` | **New** — Vercel Function; verifies Supabase JWT; signs `count` `PUT` URLs for `{bookId}/{i+1}.jpg` (5-min expiry) using `aws4fetch` `signQuery: true`; returns `{ uploads: [{ presignedUrl, publicUrl }] }` |
| `src/services/r2Storage.ts` | Rewritten — removed `AwsClient` browser instantiation; calls `/api/r2/presign` with the Supabase access token, then `fetch(presignedUrl, { method: 'PUT', body: blob })` directly to R2 |
| `src/services/r2Storage.test.ts` | Rewritten — mocks `supabase.auth.getSession` and global `fetch`; covers presign request shape, per-image PUT, partial/full failure, no-session, empty array |
| `.env.example` | Pruned to only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; all `VITE_CLOUDFLARE_*` and stale `VITE_*_API_KEY` entries removed |

### Design decisions
- **Presigned URL approach (not bytes-through-Vercel)**: Vercel Function bodies cap at ~4 MB; routing image data through Vercel would block uploads of compressed images that exceed that limit and waste bandwidth. The browser still PUTs blobs directly to R2; only the signature work is server-side.
- **Public URL constructed server-side too**: bucket name may carry a path prefix (e.g. `bucket/scans`). The server already knows the prefix and the public CDN base, so it returns the absolute `publicUrl` alongside each `presignedUrl`. The frontend no longer needs `VITE_CLOUDFLARE_R2_PUBLIC_URL` and stays unaware of bucket layout.
- **`signQuery: true` with `X-Amz-Expires=300`**: 5-minute expiry is comfortably long for compressed image PUTs (typically seconds) and short enough that a leaked URL has minimal blast radius. `Content-Type` is not signed so the client can pick the upload header freely; `X-Accel-Buffering` and bucket CORS already permit `PUT` from the app origin.
- **Count cap (`1 ≤ count ≤ 20`)**: defensive bound on the server to prevent abuse via the JWT-authenticated endpoint.
- **Auth shape mirrors `/api/scan`**: Bearer Supabase JWT, verified via `supabase.auth.getUser(token)` using `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Reusing the pattern keeps both Vercel functions consistent.
- **No-session degradation**: if `supabase.auth.getSession()` returns null on the client (e.g. a stale UI state during sign-out), `uploadImagesToR2` returns `{ urls: [], failed: 0 }` so the book still saves locally with the existing amber-warning UX, instead of throwing.
- **Server env vars added**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL`. Removed from Vercel + `.env.local`: `VITE_CLOUDFLARE_ACCOUNT_ID`, `VITE_CLOUDFLARE_R2_ACCESS_KEY_ID`, `VITE_CLOUDFLARE_R2_API_KEY`, `VITE_CLOUDFLARE_R2_BUCKET_NAME`, `VITE_CLOUDFLARE_R2_PUBLIC_URL`.

## 18. Phase 15 — Supabase Keepalive Cron (Phase 6, implemented 2026-04-26)

**Goal**: Free-tier Supabase project doesn't pause after 7 days of inactivity. Daily lightweight `SELECT` keeps the project alive.

### Files changed

| File | Change |
|------|--------|
| `api/cron/keepalive.ts` | Hardened — verifies `Authorization: Bearer ${CRON_SECRET}`, queries `profiles` (not `books`), returns JSON `{ ok: true }` |
| `vercel.json` | `crons` entry already present from Phase 13 (`/api/cron/keepalive` at `0 12 * * *`); unchanged this phase |

### Design decisions
- **`CRON_SECRET` bearer check**: Vercel automatically attaches `Authorization: Bearer ${CRON_SECRET}` to scheduled cron requests. Verifying it prevents anyone from hitting the public `/api/cron/keepalive` URL and burning the daily query against the service-role key.
- **Query `profiles` table**: matches the spec in `temp_plans/plan_backend_supabase.md` Phase 6. Any existing table works for keepalive — `profiles` is small and always present.
- **Service-role key for the SELECT**: bypasses RLS. The endpoint never returns row data, only a count, so the elevated key has no exfiltration surface beyond the auth-gated response shape.
- **Cron schedule**: `0 12 * * *` (daily at 12:00 UTC). Hobby plan limits Vercel to 2 cron jobs; this uses one slot.
- **New env var**: `CRON_SECRET` must be set in Vercel for production — Vercel both generates the value and forwards it on each cron invocation.

## 19. Phase 16 — Cleanup, env audit, docs (Phase 7, implemented 2026-04-26)

**Goal**: Close out the Supabase backend migration (Phases 10–15 above; Phases 1–6 of `temp_plans/plan_backend_supabase.md`). No stray `VITE_*_API_KEY` references in `src/` or `api/`. `.env.example` lists every server-side var Vercel needs. `README.md` and `REQUIREMENTS.md` reflect auth, multi-user isolation, server-side keys, R2 presign, and keepalive.

### Files changed

| File | Change |
|------|--------|
| `.env.example` | Re-expanded — explicitly enumerates all server-side vars required by `/api/scan`, `/api/r2/presign`, `/api/cron/keepalive`, alongside the two browser-side `VITE_SUPABASE_*` vars |
| `README.md` | Setup steps rewritten — keys go to Vercel (or local `.env.local` server-side), not `VITE_*`; "Data Storage" replaced with Supabase tables; "Adding an AI Provider" rewritten around `api/scan.ts` proxy; new "Authentication" section documents magic-link + RLS |
| `REQUIREMENTS.md` | New §0 "Authentication & Multi-User Data Isolation"; username, history, and preference sections updated to Supabase persistence |
| `Plan.md` | This section appended |

### Design decisions
- **No code changes in `src/` or `api/`**: post-audit grep confirmed only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` remain in `src/lib/supabase.ts`; both are public (anon key) by design. `api/scan.ts`, `api/r2/presign.ts`, `api/cron/keepalive.ts` already read server-side env vars without `VITE_` prefix.
- **`.env.example` is intentionally exhaustive**: a fresh contributor needs to know every var that exists, even those they won't set locally (e.g. `CRON_SECRET` is Vercel-managed). Empty values document shape; comments explain which endpoint consumes which group.
- **`temp_plans/` left alone**: those are historical planning docs. Stale `VITE_*` references there are intentional — they describe pre-migration state. `Plan.md` is the canonical history.
- **`npx supabase gen types typescript` skipped**: schema unchanged in this phase; existing `src/lib/supabase-types.ts` is current.

## 20. Phase 17 — Email + password auth (implemented 2026-04-26)

**Goal**: Let users sign in with email + password in addition to magic link, plus a self-serve forgot-password flow.

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Replaced single `signIn` with `signInWithMagicLink`, `signInWithPassword`, `signUpWithPassword`, `sendPasswordReset`, `updatePassword`. `signOut` unchanged. |
| `src/components/auth/LoginPage.tsx` | Rewritten — segmented control toggles between Magic link and Password tabs. Password tab has Sign in / Sign up sub-modes plus a Forgot password? sub-mode. Sign-up validates min-length and confirm-match locally before calling Supabase. |
| `src/components/auth/ResetPasswordPage.tsx` | **New** — handles the recovery redirect at `/auth/reset-password`. Listens for `PASSWORD_RECOVERY` (or `SIGNED_IN`) on `onAuthStateChange`, shows a "verifying" state for up to 3 s, then renders a new-password form that calls `supabase.auth.updateUser({ password })`. On success redirects to `/`. |
| `src/App.tsx` | Routes `/auth/reset-password` to the new page (alongside the existing `/auth/callback` route). |
| `REQUIREMENTS.md` | §0 expanded — magic link, password sign-in/sign-up, forgot-password flow. |
| `vercel.json` | No change — existing SPA rewrite (`/((?!api/).*)` → `/index.html`) already covers `/auth/reset-password`. |

### Design decisions
- **One screen, two tabs (not separate routes)**: keeps the surface area small and lets users discover both methods immediately. Switching tabs resets in-flight error/info state and password fields so credentials don't leak between modes.
- **Sub-modes inside Password tab**: Sign in / Sign up / Forgot password share the same email + password layout with conditional fields. Avoids three near-duplicate components.
- **Min length 8, confirm match — client-side only at the form level**: Supabase enforces its own server-side rules (configurable per project), so the client check is purely a UX guard against an obvious typo.
- **`emailRedirectTo` for sign-up points at `/auth/callback`**: confirmation link reuses the existing PKCE exchange path. `resetPasswordForEmail`'s `redirectTo` points at `/auth/reset-password` because that flow needs the new dedicated page.
- **Recovery page waits up to 3s for `PASSWORD_RECOVERY` event**: Supabase JS parses the URL fragment asynchronously. If no session shows up by then, the link is invalid/expired and we surface a clear error rather than leaving a spinner.
- **Server-side prerequisite (out of code)**: Supabase project must have the Email provider enabled with password support (Auth → Providers → Email). Email confirmations on sign-up are optional — the UI handles both branches (immediate session vs. "check your email").

## 21. Phase 18 — Google OAuth sign-in (implemented 2026-04-27)

**Goal**: Let users sign in / sign up with Google via Supabase OAuth, alongside magic link and password.

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Added `signInWithGoogle()` calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/auth/callback } })`. |
| `src/components/auth/LoginPage.tsx` | Added "Continue with Google" button at the top of the auth card with a brand-colored Google glyph and an "or" divider above the existing magic link / password tabs. |
| `REQUIREMENTS.md` | §0 expanded — Google added to sign-in methods; new bullet describes the OAuth flow and Supabase prerequisite. |

### Design decisions
- **Reuse the existing `/auth/callback` page**: it already handles the PKCE `code` exchange, so Google redirects there with no new route or code path.
- **Single primary Google button (not a tab)**: OAuth is a one-tap flow with no fields, so a tab would feel empty. Putting it above the tabs makes it the most prominent option, which matches user expectations from other apps.
- **Inline SVG Google glyph**: avoids pulling in a brand-icons dependency and keeps the button rendering deterministic.
- **No account-linking UI**: Supabase auto-links the OAuth identity to an existing email-based row when emails match, so a user who previously used magic link / password with the same Gmail address keeps the same `auth.users.id`. No client-side merge logic needed.
- **Server-side prerequisite (out of code)**: Google provider must be enabled in Supabase (Auth → Providers → Google) with a Client ID + Secret from Google Cloud Console, and Supabase's callback URL (`https://<project>.supabase.co/auth/v1/callback`) added to the Google OAuth client's "Authorized redirect URIs".

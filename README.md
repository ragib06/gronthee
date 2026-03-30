
![Gronthee](src/assets/logo.svg)

A web app for cataloging books by scanning their covers or title pages with AI. Point your camera or drop an image — Gronthee extracts the metadata, lets you review and correct it, and keeps a searchable history you can export to CSV.


---

## Features

- **AI-powered scanning** — upload images or use your webcam; supports up to 4 images per scan (cover, title page, copyright page, back cover)
- **Multi-provider AI** — choose between Anthropic Claude, OpenAI GPT, and Google Gemini at runtime
- **English output** — all metadata is translated to English regardless of the book's original language
- **Edit & correct** — review every extracted field in a structured form before saving
- **Preference learning** — the app remembers your corrections and auto-applies them on future scans
- **Search & sort** — filter history by title or author; sort by date or title
- **CSV export** — export your full library with a personalised filename (`gronthee-<username>-<yyyy-mm-dd-hh-mm-ss>.csv`)
- **Reset** — clear all data (username, history, preferences) with a single confirmed action

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Animations | Motion (`motion/react`) |
| Camera | react-webcam |
| File upload | react-dropzone |
| AI providers | Anthropic SDK, OpenAI SDK, Google Generative AI |

---

## Getting Started

### 1. Clone the repo

```bash
git clone git@github.com:ragib06/gronthee.git
cd gronthee
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure API keys

Create a `.env.local` file in the project root with your API keys:

```bash
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

You only need keys for the providers you intend to use. `.env.local` is gitignored — your keys are never committed.

> **Deploying to Vercel?** Add these as environment variables in the Vercel dashboard (Settings → Environment Variables) instead of using `.env.local`.

### 4. (Optional) Customise AI providers and models

The provider and model list lives in `ai-config.json` at the project root. It is committed to the repo and contains no secrets. Edit it to add, remove, or reorder providers and models:

```json
{
  "defaultProvider": "anthropic",
  "defaultModelId": "claude-opus-4-5",
  "providers": [
    {
      "provider": "anthropic",
      "label": "Anthropic",
      "models": [
        { "id": "claude-opus-4-5", "label": "Claude Opus 4.5" },
        { "id": "claude-sonnet-4-5", "label": "Claude Sonnet 4.5" },
        { "id": "claude-haiku-3-5", "label": "Claude Haiku 3.5" }
      ]
    }
  ]
}
```

See `ai-config.example.json` for the full default configuration.

### 5. Start the dev server

```bash
npm run dev
```

The app runs over HTTPS locally via `vite-plugin-mkcert` (required for webcam access). Accept the locally-trusted certificate if prompted.

---

## Available Commands

```bash
npm run dev        # Start dev server (HTTPS, hot reload)
npm run build      # Production build
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

---

## How It Works

### Scan
1. Select an AI model from the dropdown in the top bar
2. Upload images (drag & drop or file picker) or switch to Webcam tab and capture
3. On **mobile phones** the back (rear) camera is used by default — ideal for scanning physical books. On desktops and tablets the front camera is used.
4. Up to 4 images per scan — cover, title page, copyright page, back cover
5. Click **Scan Book** — the images are sent to the selected AI provider
6. All metadata is returned in English (translated if needed)

### Review & Save
- Every extracted field is shown in an editable form
- Required fields are marked with `*` — saving is blocked until all are filled; a banner at the bottom of the form explains what to fix
- Optional fields: Subtitle, Other Title, Second Author, Editor, Translator, Illustrator
- Correct any mistakes — corrections are remembered and auto-applied on future scans

### History
- All saved books appear in a searchable, sortable grid
- Click any card to view full details; edit or delete from the detail view
- **Export CSV** — downloads your full library as a CSV file

---

## Metadata Fields

| Field | Required | Notes |
|---|---|---|
| Title | Yes | |
| Subtitle | No | |
| Other Title | No | |
| Author | Yes | |
| Second Author | No | |
| Editor | No | |
| Translator | No | |
| Illustrator | No | |
| Publisher | Yes | |
| Published Year | Yes | YYYY format |
| ISBN | Yes | |
| Category | Yes | Free text; AI suggests "Fiction" or "Non Fiction" |
| Genre | Yes | e.g. Poetry, Biography |
| Collection | Yes | Coded field — see below |
| Item Type | Yes | Coded field — see below |
| Page Count | Yes | |
| Language | Yes | ISO 639-1 code (e.g. EN, BN, FR) |
| Edition | Yes | e.g. 1st, 2nd |
| Publication Place | Yes | City only |
| Scan Date | Auto | YYYY-MM-DD, non-editable |
| Summary | Yes | 1–2 sentence description |

### Collection Codes

| Code | Label |
|---|---|
| ART | Art |
| BIO | Biography |
| CHI | Children |
| COLL | Collection |
| CRI | Literary Criticism |
| FIC | Fiction |
| HYST | History |
| MYTH | Mythology |
| MISC | Miscellaneous |
| NFIC | Non-Fiction |
| PLAY | Play |
| POET | Poetry |
| REF | Reference |
| SCIFI | Science Fiction |
| SPI | Spiritual |
| SPO | Sports |
| TRVL | Travel |
| COOK | Cook |
| MUSC | Music |
| ESSY | Essay |

### Item Type Codes

| Code | Label |
|---|---|
| BK | Book |
| ASB | Author Signed Book |
| RB | Rare Book |
| REF | Reference |
| MG | Magazine |

---

## Data Storage

All data is stored in the browser's `localStorage` — nothing is sent to any server except the AI provider APIs.

| Key | Contents |
|---|---|
| `gronthee-username` | Your username (set on first launch) |
| `gronthee:books` | Saved book records |
| `gronthee:preferences` | Per-field correction mappings |

To wipe everything, use the **Reset all data** link at the bottom of any page.

---

## Customising Coded Field Mappings

The **Collection** and **Item Type** fields use short codes internally (e.g. `FIC`, `BK`). The codes are what get stored and exported to CSV; the human-readable labels are shown in the UI dropdown and used in the AI prompt. To add, remove, or rename a mapping you need to update three files in sync.

### 1. Update the type definition — `src/types/index.ts`

Add or remove codes from the union type:

```typescript
// Collection codes
export type CollectionCode =
  | 'ART' | 'BIO' | 'CHI' | 'COLL' | 'CRI'
  | 'FIC' | 'HYST' | 'MYTH' | 'MISC' | 'NFIC'
  | 'PLAY' | 'POET' | 'REF' | 'SCIFI' | 'SPI'
  | 'SPO' | 'TRVL' | 'COOK' | 'MUSC' | 'ESSY'
  | 'GRPH'  // ← example: adding Graphic Novel

// Item type codes
export type ItemTypeCode = 'BK' | 'ASB' | 'RB' | 'REF' | 'MG' | 'COM'  // ← example: adding Comic
```

### 2. Update the label map — `src/constants/mappings.ts`

Add the matching entry to `COLLECTION_LABELS` or `ITEM_TYPE_LABELS`. The reverse maps (`LABEL_TO_COLLECTION`, `LABEL_TO_ITEM_TYPE`) are derived automatically — no changes needed there.

```typescript
export const COLLECTION_LABELS: Record<CollectionCode, string> = {
  // ... existing entries ...
  GRPH: 'Graphic Novel',  // ← new entry
}

export const ITEM_TYPE_LABELS: Record<ItemTypeCode, string> = {
  // ... existing entries ...
  COM: 'Comic',  // ← new entry
}
```

### 3. Update the AI prompt — `src/services/ai/prompt.ts`

Add the new human-readable label to the list the AI is instructed to use, so it can map scanned books to the new category:

```
For "collection", return one of these exact human-readable values or "":
  Art, Biography, ..., Graphic Novel
```

> **Removing a mapping**: remove the code from the type union, the label map, and the prompt list. Existing saved books that carry the old code will still display correctly in history (the label lookup falls back gracefully), but the code will no longer appear in the Collection dropdown.

---

## Adding an AI Provider

1. Add the provider's SDK: `npm install <sdk>`
2. Create an adapter in `src/services/ai/` following the contract:
   ```typescript
   export async function extractBookMetadata(
     images: Base64Image[],
     modelId: string,
     apiKey: string
   ): Promise<Partial<BookMetadata>>
   ```
3. Register it in `src/services/ai/index.ts`
4. Add the provider entry (without any `apiKey` field) to `ai-config.json`
5. Add the corresponding `VITE_<PROVIDER>_API_KEY` to `.env.local` (and to Vercel env vars for deployments)

---

## License

MIT

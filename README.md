# Gronthee

A web app for cataloging books by scanning their covers or title pages with AI. Point your camera or drop an image — Gronthee extracts the metadata, lets you review and correct it, and keeps a searchable history you can export to CSV.

![Book scanning app](src/assets/hero.png)

---

## Features

- **AI-powered scanning** — upload images or use your webcam; supports up to 4 images per scan (cover, title page, copyright page, back cover)
- **Multi-provider AI** — choose between Anthropic Claude, OpenAI GPT, and Google Gemini at runtime
- **English output** — all metadata is translated to English regardless of the book's original language
- **Edit & correct** — review every extracted field in a structured form before saving
- **Preference learning** — the app remembers your corrections and auto-applies them on future scans
- **Search & sort** — filter history by title or author; sort by date or title
- **CSV export** — export your full library with a personalised filename (`gronthee-<username>-<timestamp>.csv`)
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

### 3. Configure AI providers

Copy the example config and fill in your API keys:

```bash
cp ai-config.example.json ai-config.json
```

Edit `ai-config.json`:

```json
{
  "defaultProvider": "anthropic",
  "defaultModelId": "claude-opus-4-5",
  "providers": [
    {
      "provider": "anthropic",
      "label": "Anthropic",
      "apiKey": "YOUR_ANTHROPIC_API_KEY",
      "models": [
        { "id": "claude-opus-4-5", "label": "Claude Opus 4.5" },
        { "id": "claude-sonnet-4-5", "label": "Claude Sonnet 4.5" },
        { "id": "claude-haiku-3-5", "label": "Claude Haiku 3.5" }
      ]
    },
    {
      "provider": "openai",
      "label": "OpenAI",
      "apiKey": "YOUR_OPENAI_API_KEY",
      "models": [
        { "id": "gpt-4o", "label": "GPT-4o" },
        { "id": "gpt-4o-mini", "label": "GPT-4o Mini" }
      ]
    },
    {
      "provider": "gemini",
      "label": "Google Gemini",
      "apiKey": "YOUR_GEMINI_API_KEY",
      "models": [
        { "id": "gemini-2.0-flash", "label": "Gemini 2.0 Flash" },
        { "id": "gemini-1.5-pro", "label": "Gemini 1.5 Pro" }
      ]
    }
  ]
}
```

> `ai-config.json` is gitignored — your keys are never committed.

### 4. Start the dev server

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
3. Up to 4 images per scan — cover, title page, copyright page, back cover
4. Click **Scan Book** — the images are sent to the selected AI provider
5. All metadata is returned in English (translated if needed)

### Review & Save
- Every extracted field is shown in an editable form
- Required fields are marked with `*` — saving is blocked until all are filled
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
| Category | Yes | e.g. Fiction, Non-Fiction |
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
4. Add the provider entry to `ai-config.json`

---

## License

MIT

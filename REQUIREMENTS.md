# Gronthee - Book Cataloging System Requirements

## Project Overview
Gronthee is a web-based application designed to automate the process of cataloging books by scanning their covers and title pages using AI. It leverages third party AI model (configurable) to extract detailed metadata from images and provides a user-friendly interface for reviewing, editing, and exporting the data.

## Core Features

### 1. Book Scanning & Data Extraction
- **Image Input**: Supports both file uploads (drag-and-drop) and real-time webcam capture. Accepted formats: JPEG, PNG, WEBP. Maximum file size: 25 MB per image, up to 4 images per scan. The webcam flow requires a secure context (HTTPS or localhost) — the dev server runs over HTTPS via `vite-plugin-mkcert` (locally-trusted certificate). It requests browser camera permission on activation; shows a loading state while prompting, the live feed once granted, and a specific error for each failure case: permission denied (Retry), no camera found, or camera in use (Retry). On mobile phones (Android Mobile / iPhone / iPod), the back (environment-facing) camera is used by default to facilitate book scanning; on desktops and tablets the front camera is used. When the camera feed becomes ready, the page auto-scrolls so the feed and capture button are fully visible (pushing the page header off screen). The video feed is size-constrained (`max-h-[52vh] w-auto`) to fit together with the capture button in the viewport; the container wraps the video tightly (`w-fit`) to avoid black side bars.
- **AI Analysis**: Uses third party AI models to analyze one or multiple images of a book. It should support multiple providers (i.e Claude, GPT, Gemini, OpenRouter). The API keys are stored as Vercel environment variables (`VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_OPENROUTER_API_KEY`) and read at runtime via `import.meta.env`. Users get to choose a model from a dropdown list before scanning. OpenRouter models (e.g. Qwen 3.6 Plus, model ID `qwen/qwen3.6-plus:free`) are accessed via the OpenAI-compatible API at `https://openrouter.ai/api/v1`. Gemma 4 (model ID `gemma-4-31b-it`) is available under the Google Gemini provider and is accessed via the `@google/generative-ai` SDK.
- **English Language Emphasis**: All scan results (author, genre, summary, publisher, etc.) are provided in English or romanised/transliterated form, even if the original book is in a non-English language. **Exception — Book Title**: the `title` field always uses the title exactly as it appears on the book (romanised if non-Latin script). If an English translation of the title also appears on the book, it goes into `otherTitle`. An English translation must never be placed in `title` when the original title is available.
- **Metadata Extraction**: Automatically identifies and extracts the following fields:
    - **Title**: Primary title of the book.
    - **Sub Title**: Secondary title or subtitle.
    - **Other Title**: Additional titles (defaults to empty).
    - **Author**: Primary author's name. If the AI returns no value, defaults to `N/A`.
    - **Second Author**: Secondary author(s), if applicable.
    - **Editor**: Editor's name (common for collections).
    - **Translator**: Name of the translator for translated works.
    - **Illustrator**: Name of the illustrator.
    - **Publisher**: Publishing house name. For Bengali books, the AI is instructed to use the name listed under প্রকাশক (publisher) — not পরিবেশক (distributor). If both appear, প্রকাশক always takes priority.
    - **Published Year**: Year of publication in Gregorian YYYY format. When multiple editions with different years appear on the book, the AI always picks the latest year. The AI also extracts or derives the Bengali era (Bangla Saal) year (`publishedYearBengali`). If only a Bengali year appears on the book (e.g. "Boishakh 1407"), it is converted to Gregorian by adding 593. If only a Gregorian year is present, the Bengali year is derived by subtracting 593. Both fields are always filled when at least one is determinable. In the editor, when a Bengali year is present, a note is shown below the Year field: "Bengali calendar: {year} BS".
    - **ISBN**: International Standard Book Number. Dashes must be stripped on save (e.g. `978-3-16-148410-0` → `9783161484100`). If the AI returns no value, defaults to `N/A`.
    - **Category**: High-level classification. Dropdown with fixed options: "Fiction", "Non-Fiction", "Miscellaneous". AI is instructed to return one of these exact values. If the AI returns a value not in the list, it is reset to empty and the user must select manually.
    - **Genre**: Specific genre. Dropdown with fixed options: Agriculture, Analytical Essays, Art, Art History, Autobiography, Belles Letters, Bilingual, Biography, Children, Collected Works, Comedy, Cooking, Crime, Culture, Dictionary, Drama, Education, Essay, Fiction, Historical Fiction, History, Indian Magazine, Indian Philosophy, Islamic History, Letters, Literary Criticism, Lyrics, Magazine, Math, Memoir, Miscellaneous, Muktijuddha, Mythology, Nature, Non-Fiction, Novel, Novella, Partitition, Philosophy, Play, Poetry, Reference, Religion, Sanskrit, Science, Science Fiction, Short Stories, Song, Spirituality, Story, Tagore, Thriller, Translation, Travel, Travelogue, Workbook.
    - **Collection**: A coded field mapped to specific categories (see Mappings below).
    - **Item Type**: A coded field representing the physical type of the item (see Mappings below).
    - **Page Count**: Total number of pages.
    - **Language**: ISO 639-1 language code in ALL CAPS (e.g., EN, BN, FR).
    - **Edition**: Ordinal edition number (e.g., 1st, 2nd, 3rd). Only edition or publication dates are considered — impression numbers, print run numbers, and reprint dates are ignored. If multiple editions are mentioned, always use the highest (latest) one.
    - **Publication Place**: City of publication only (no country or state).
    - **Scan Date**: Automatically generated current date in YYYY-MM-DD format (Non-editable).
    - **Summary**: A brief 1-2 sentence summary of the book.

### 2. Data Management
- **Edit Form**: A comprehensive form allowing users to review and correct AI-extracted data before saving. Most fields are mandatory — saving is blocked if any required field is empty, with inline error messages and red border highlights on each invalid field. Errors clear as the user fills in each field. When save fails due to validation, a red error banner is shown below the form fields instructing the user to fill in all highlighted fields; the banner disappears on a successful save. Optional fields (no validation) are: Subtitle, Other Title, Second Author, Editor, Translator, Illustrator. Required fields that are empty on initial load (e.g. when AI could not extract a value) show an amber background (`bg-amber-50`) immediately, before any save attempt, to prompt the user to fill them in.
- **User Preference Storage**: The system learns from user edits to the **Author** field only. If the user manually corrects the author name and the edit is a minor correction (Levenshtein distance ≤ 30% of the original length, e.g. max 3 characters changed out of 10), the mapping is stored in local storage. Future scans that produce the same original author value will automatically be corrected to the user's preferred value. Edits that exceed the threshold (e.g. completely rewriting the name) are not stored.
- **Display View**: A clean, structured view of the extracted metadata.
- **History Tracking**: Saves scanned books to the browser's local storage for persistence across sessions.
- **CSV Export**: Allows users to export their entire scanning history into a CSV file with all metadata fields. Clicking "Export CSV" opens a modal dialog with an editable filename field pre-filled with `gronthee-<username>-<datetime>.csv` (using the stored username and the current date/time formatted as `yyyy-mm-dd-hh-mm-ss`). The user can edit the name and click "Save" to trigger the download, or cancel. If the filename lacks a `.csv` extension it is appended automatically. The `Collection` and `Item Type` columns use abbreviated codes (e.g. `FIC`, `BK`) not human-readable labels.
- **Username**: On first launch, the app shows a welcome popup asking the user to enter a username. The username is stored in `localStorage` under the key `gronthee-username` and persists across sessions. The popup is only shown once (when no username is stored). The username is displayed as a greeting ("Welcome, \<username\>") above the heading on the Scan page, and is used to personalise the default CSV export filename. Whitespace characters are not allowed in the username — they are stripped from the input as the user types.
- **Page Count Prompt**: When the user clicks "Scan Book", a popup dialog is shown immediately — before the AI call is made — asking for the number of pages. The user may enter a value or skip. The value is stored and merged into the scanned metadata after the AI call completes, before navigating to the editor. On mobile, the dialog adjusts its position using the `visualViewport` API so it is not obscured by the on-screen keyboard.
- **Sessions**: Users can organise scans into named sessions. Each saved book belongs to the currently active session. Sessions are managed via a `SessionSelector` dropdown shown on the Scan page (below the heading) and implicitly assigned when saving a book from the Editor page. On the Review & Save page (new book only), the active session is shown below the Save button as a right-aligned label — "Active session: `<name>`" — so users know which session the book will be saved to before confirming.
  - **Session data model**: A `Session` has `{ id, name, createdAt }`. The `id` is a URL-safe slug derived from the name. Every `BookMetadata` record has a `sessionId` field.
  - **Default session**: A built-in "Default" session always exists (`id = 'default'`). It cannot be renamed or deleted. Existing books that predate sessions are automatically migrated to `sessionId = 'default'` on first load.
  - **Creating sessions**: Users can create new named sessions from the `SessionSelector` dropdown. Names must be unique (case-insensitive). Maximum 50 sessions total.
  - **Renaming sessions**: Any session except Default can be renamed inline via a pencil icon (visible on hover in the selector list). Name length capped at 50 characters.
  - **Deleting sessions**: Any session except Default can be deleted via a trash icon. A confirmation dialog shows the number of books that will be moved to Default before proceeding. Books are never orphaned — they are always reassigned to Default on session delete.
  - **Switching sessions**: Selecting a session from `SessionSelector` updates the active session for future scans. The last-used session is persisted under `gronthee:currentSessionId` and restored on next visit. If the stored session no longer exists, falls back to Default.
  - **History filtering**: The History page shows session filter chips (All + one per session). Clicking a chip filters the book list to that session only. Filter is local UI state — does not change the active scan session.
  - **Export per session**: The Export CSV dialog lists all sessions, each showing its name and book count alongside a dedicated Export button. Clicking a row's Export button downloads that session's CSV immediately (named `gronthee-<username>-<sessionSlug>-<datetime>.csv`) without closing the dialog, allowing multiple sessions to be downloaded one at a time. There are no checkboxes or bulk-select controls. The dialog has a single Cancel button at the bottom right to dismiss it.
  - **localStorage keys**: `gronthee:sessions` (`Session[]`), `gronthee:currentSessionId` (`string`). Both are cleared on "Reset all data".
- **Reset All Data**: A "Reset all data" link at the bottom of every page clears all app data. Clicking it shows a confirmation dialog listing what will be deleted (username, book history, edit preferences) with a warning that the action cannot be undone. Confirming removes all localStorage keys (`gronthee-username`, `gronthee:books`, `gronthee:preferences`, `gronthee:sessions`, `gronthee:currentSessionId`) and reloads the page. The button is styled in red to reflect its destructive nature.
- **Persistent Model Selection**: The user's selected AI provider and model are persisted in `localStorage` under the key `gronthee:selectedModel` (stored as `{provider, modelId}` — the API key is never stored). On next visit, the last-used model is restored automatically. Falls back to the configured default if the saved value is missing or invalid.
- **Persistent Input Source (Webcam Memory)**: If the user selects the Webcam tab, that choice is saved in `localStorage` under the key `scanner-tab`. When the user returns to the Scan page the webcam feed starts immediately. If there is no user activity (mouse move, click, keydown, touch, scroll) for 3 minutes while on the Webcam tab, the app automatically switches back to the Upload tab and removes the saved preference — prompting the user to actively re-select webcam next time.

### 3. User Interface
- **Branding**: The browser tab shows a book icon favicon (SVG, indigo color scheme matching the app) and the page title "Gronthee".
- **Responsive Design**: Optimized for both desktop and mobile usage.
- **Modern Aesthetic**: Built with Tailwind CSS, featuring a clean, professional look with smooth animations (using Motion).
- **Interactive Feedback**: Loading states, success indicators, and error handling for a seamless experience.
- **Mobile Image Preview**: On the Review & Save page, scanned images are displayed in a 2-column grid on mobile (single column on desktop/tablet). The thumbnail grid is constrained to `max-w-[240px]` on mobile so images remain compact (~120px each). Each thumbnail uses a 3:4 aspect ratio. Tapping an image opens a full-screen zoom modal with:
  - Zoom steps: 1×, 1.5×, 2×, 3× — controlled via bottom toolbar (ZoomIn/ZoomOut buttons + dot indicators)
  - Tapping the image itself toggles between 1× and 2×
  - Current zoom level shown as a badge in the top-left
  - At zoom > 1× the image is scrollable within the modal
  - Close button (top-right) or tapping the backdrop dismisses the modal and resets zoom to 1×

## Field Mappings

### Collection Mapping
The `Collection` field uses specific codes mapped to human-readable names:
- **ART**: Art
- **BIO**: Biography
- **CHI**: Children
- **COLL**: Collection
- **CRI**: Literary Criticism
- **FIC**: Fiction
- **HYST**: History
- **MYTH**: Mythology
- **MISC**: Miscellaneous
- **NFIC**: Non-Fiction
- **PLAY**: Play
- **POET**: Poetry
- **REF**: Reference
- **SCIFI**: Science Fiction
- **SPI**: Spiritual
- **SPO**: Sports
- **TRVL**: Travel
- **COOK**: Cook
- **MUSC**: Music
- **ESSY**: Essay

### Item Type Mapping
The `Item Type` field uses specific codes mapped to human-readable names:
- **BK**: Book
- **ASB**: Author Signed Book
- **RB**: Rare Book
- **REF**: Reference
- **MG**: Magazine

## Technical Stack
- **Frontend**: React (TypeScript)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Motion (motion/react)
- **AI Integration**: Multiple third party providers; API keys stored as Vercel environment variables
- **Camera**: react-webcam
- **File Handling**: react-dropzone

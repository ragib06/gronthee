# Gronthee - Book Cataloging System Requirements

## Project Overview
Gronthee is a web-based application designed to automate the process of cataloging books by scanning their covers and title pages using AI. It leverages third party AI model (configurable) to extract detailed metadata from images and provides a user-friendly interface for reviewing, editing, and exporting the data.

## Core Features

### 1. Book Scanning & Data Extraction
- **Image Input**: Supports both file uploads (drag-and-drop) and real-time webcam capture. Accepted formats: JPEG, PNG, WEBP. Maximum file size: 25 MB per image, up to 4 images per scan. The webcam flow requires a secure context (HTTPS or localhost) — the dev server runs over HTTPS via `vite-plugin-mkcert` (locally-trusted certificate). It requests browser camera permission on activation; shows a loading state while prompting, the live feed once granted, and a specific error for each failure case: permission denied (Retry), no camera found, or camera in use (Retry). On mobile phones (Android Mobile / iPhone / iPod), the back (environment-facing) camera is used by default to facilitate book scanning; on desktops and tablets the front camera is used.
- **AI Analysis**: Uses third party AI models to analyze one or multiple images of a book. It should support multiple providers (i.e Claude, GPT, Gemini). The API keys are stored as Vercel environment variables (`VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`) and read at runtime via `import.meta.env`. Users get to choose a model from a dropdown list before scanning.
- **English Language Emphasis**: All scan results (title, author, genre, summary, etc.) are provided in English, even if the original book is in a non-English language. The AI is instructed to translate the metadata into English.
- **Metadata Extraction**: Automatically identifies and extracts the following fields:
    - **Title**: Primary title of the book.
    - **Sub Title**: Secondary title or subtitle.
    - **Other Title**: Additional titles (defaults to empty).
    - **Author**: Primary author's name.
    - **Second Author**: Secondary author(s), if applicable.
    - **Editor**: Editor's name (common for collections).
    - **Translator**: Name of the translator for translated works.
    - **Illustrator**: Name of the illustrator.
    - **Publisher**: Publishing house name.
    - **Published Year**: Year of publication in YYYY format.
    - **ISBN**: International Standard Book Number.
    - **Category**: High-level classification (e.g., Fiction, Non-Fiction).
    - **Genre**: Specific genre (e.g., Poetry, Novel, Biography, Travel).
    - **Collection**: A coded field mapped to specific categories (see Mappings below).
    - **Item Type**: A coded field representing the physical type of the item (see Mappings below).
    - **Page Count**: Total number of pages.
    - **Language**: ISO 639-1 language code in ALL CAPS (e.g., EN, BN, FR).
    - **Edition**: Ordinal edition number (e.g., 1st, 2nd, 3rd).
    - **Publication Place**: City of publication only (no country or state).
    - **Scan Date**: Automatically generated current date in YYYY-MM-DD format (Non-editable).
    - **Summary**: A brief 1-2 sentence summary of the book.

### 2. Data Management
- **Edit Form**: A comprehensive form allowing users to review and correct AI-extracted data before saving. Most fields are mandatory — saving is blocked if any required field is empty, with inline error messages and red border highlights on each invalid field. Errors clear as the user fills in each field. Optional fields (no validation) are: Subtitle, Other Title, Second Author, Editor, Translator, Illustrator.
- **User Preference Storage**: The system learns from user edits. If a user manually corrects a field (e.g., changes a misspelled publisher name), the system stores this mapping in local storage. Future scans that produce the same original value will automatically be corrected to the user's preferred value.
- **Display View**: A clean, structured view of the extracted metadata.
- **History Tracking**: Saves scanned books to the browser's local storage for persistence across sessions.
- **CSV Export**: Allows users to export their entire scanning history into a CSV file with all metadata fields. Clicking "Export CSV" opens a modal dialog with an editable filename field pre-filled with `gronthee-<username>-<timestamp>.csv` (using the stored username and `Date.now()` as the timestamp). The user can edit the name and click "Save" to trigger the download, or cancel. If the filename lacks a `.csv` extension it is appended automatically.
- **Username**: On first launch, the app shows a welcome popup asking the user to enter a username. The username is stored in `localStorage` under the key `gronthee-username` and persists across sessions. The popup is only shown once (when no username is stored). The username is displayed as a greeting ("Welcome, \<username\>") above the heading on the Scan page, and is used to personalise the default CSV export filename.
- **Reset All Data**: A "Reset all data" link at the bottom of every page clears all app data. Clicking it shows a confirmation dialog listing what will be deleted (username, book history, edit preferences) with a warning that the action cannot be undone. Confirming removes all three localStorage keys (`gronthee-username`, `gronthee:books`, `gronthee:preferences`) and reloads the page. The button is styled in red to reflect its destructive nature.

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

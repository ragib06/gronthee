# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gronthee** is a greenfield web app for cataloging books by scanning covers/title pages with AI. The project is currently in the requirements phase — only `REQUIREMENTS.md` exists. No source code has been written yet.

## Planned Tech Stack

- **Framework**: React + TypeScript (Vite recommended)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Motion (`motion/react`)
- **Camera**: `react-webcam`
- **File upload**: `react-dropzone`
- **AI providers**: Claude, GPT (OpenAI), Gemini — API keys in a config file; user selects model from a dropdown

## Commands (once project is initialized)

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (HTTPS via vite-plugin-mkcert)
npm run build      # Production build
npm run lint       # Lint
npm run preview    # Preview production build
```

## Architecture Notes

### Core Workflows
1. **Scan** — User uploads image(s) or captures via webcam → sends to selected AI provider → extracts metadata
2. **Edit** — Review/correct extracted fields in a form before saving
3. **History** — All scanned books persisted in `localStorage`
4. **Export** — Full history exportable as CSV

### Key Design Decisions (from REQUIREMENTS.md)
- All metadata output must be in **English** regardless of book language — AI prompt must enforce translation
- **User preference learning**: when a user corrects a field, store the mapping `{original → corrected}` in `localStorage`; apply automatically on future scans
- **Scan Date** is auto-generated (`YYYY-MM-DD`) and non-editable
- **Collection** and **Item Type** are coded fields with fixed mappings (see `REQUIREMENTS.md` for the full lists)

### Field Mappings (abbreviated)
- Collection codes: `ART, BIO, CHI, COLL, CRI, FIC, HYST, MYTH, MISC, NFIC, PLAY, POET, REF, SCIFI, SPI, SPO, TRVL, COOK, MUSC, ESSY`
- Item Type codes: `BK` (Book), `ASB` (Author Signed Book), `RB` (Rare Book), `REF` (Reference), `MG` (Magazine)

## CRITICAL: Working Instructions

> **These instructions are MANDATORY and must be followed on every codebase update, no exceptions.**

- Whenever a fix or change is made based on user feedback, always update `REQUIREMENTS.md` and `Plan.md` to reflect the change before considering the task done.
- **Do NOT mark any task as complete until both `REQUIREMENTS.md` and `Plan.md` have been updated.**

### AI Integration
- Provider and model selection should be runtime-configurable via a config file (not hardcoded)
- Must support at minimum: Anthropic Claude, Google Gemini

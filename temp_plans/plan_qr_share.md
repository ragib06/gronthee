# Gronthee — QR Code Config Share/Import

**Generated:** 2026-04-25
**Feature:** Round-trip export config sharing via QR code — generate on export, scan camera on import.
**Scope:** Export side (QR display dialog) + Import side (in-app camera scan tab).

---

## 1. Goal

Replace the friction-heavy JSON file download/upload with a QR-based flow:

- **Export side**: "Show QR" option on each config card → modal displays QR containing the minified config JSON.
- **Import side**: "Scan QR" tab in `ImportConfigDialog` → opens device camera, scans QR in real time, feeds decoded JSON into the existing validation + confirm flow.

The file-based share/import path is **preserved** as a fallback. Both paths feed into the same `parseImported` validator and `createConfig` mutator.

---

## 2. Design Decisions

### 2.1 Data encoding

QR codes encode raw bytes. Config JSON is minified (`JSON.stringify` without indent) before encoding.

**Size budget** (QR Version 40, byte mode): **2953 bytes max**.

The Dishari built-in (39 columns, longest header ~26 chars) minifies to ~2600 bytes — fits, but tight. A soft cap of **2700 bytes** is applied; configs exceeding it get a warning banner in the QR dialog ("Config is large — QR may not scan on all devices") but generation still proceeds. At exactly 2953 bytes the `qrcode` lib throws; catch it and surface a hard error ("Config too large for QR — use file export instead").

`serializeForShare` already strips `id` and `builtIn`. Use its output, then `JSON.stringify(JSON.parse(output))` to re-minify (removes the 2-space indent added by the current implementation). This keeps the encoding path simple and consistent.

### 2.2 Libraries

| Package | Purpose | Bundle cost |
|---|---|---|
| `qrcode` | Generate QR → `<canvas>` | ~45 KB gzip |
| `jsqr` | Decode QR from `ImageData` | ~20 KB gzip |

Both are client-side, zero-network, MIT licensed.

`qrcode` API used: `QRCode.toCanvas(canvasEl, data, options)` (returns a Promise).
`jsqr` API used: `jsQR(imageData.data, width, height)` (sync, returns `{ data: string } | null`).

### 2.3 QR dialog (export side)

New modal: `QrCodeDialog.tsx`.

- Opens when user clicks "QR" on a config card.
- Renders a `<canvas>` filled by `qrcode.toCanvas(...)`.
- QR background white, foreground indigo-700 (matches brand).
- Shows config name + column count below QR.
- Soft-size warning banner above canvas when minified JSON is 2700–2953 bytes.
- Hard error replaces canvas when `qrcode` throws (>2953 bytes).
- "Download QR as PNG" button — `canvas.toDataURL('image/png')` → anchor download.
- "Download JSON instead" fallback link — triggers existing `handleShare` download path.
- Dismiss via Escape or backdrop click.

### 2.4 QR scan tab (import side)

`ImportConfigDialog` gains a two-tab layout: **File** (existing flow, unchanged) and **Scan QR** (new).

Scan QR tab:
- Requests `getUserMedia({ video: { facingMode: 'environment' } })` on tab activation.
- Streams video into a hidden `<video>` element.
- `requestAnimationFrame` loop draws each frame to an offscreen `<canvas>`, then calls `jsQR(ctx.getImageData(...))`.
- On first successful decode: stop camera, call `parseImported(result.data)`.
  - If valid → transition to the existing "preview + rename + confirm" step (reuse existing state machine in `ImportConfigDialogInner`).
  - If invalid → show error banner, keep camera running so user can try again.
- Camera is stopped on tab switch, dialog close, or successful parse.
- If `getUserMedia` is denied: show message "Camera access denied — use File tab instead."
- Scanning indicator: animated border pulse on the video element.

### 2.5 Share button UX

Currently `ConfigCard` has one "Share" button that triggers a direct download. Replace with a two-option split:

- **Download JSON** — existing behaviour (icon: `Download`).
- **Show QR** — opens `QrCodeDialog` (icon: `QrCode` from lucide-react).

Keep both on the same card action row. No dropdown — two explicit buttons is clearer since the actions are meaningfully different.

### 2.6 No new storage

QR is purely a transport mechanism. Nothing is written to `localStorage` that wasn't already. The QR-scanned config goes through `parseImported` → `createConfig` exactly like a file import.

---

## 3. Implementation Phases

Each phase ends in a working app. Run `npm run build` after every phase.

### Phase 1 — Dependencies + QR generation utility

1. `npm install qrcode jsqr` + `npm install -D @types/qrcode @types/jsqr`.
2. Add `src/utils/configToQr.ts`:
   ```typescript
   import QRCode from 'qrcode'
   import { serializeForShare } from '@/services/exportConfig'
   import type { ExportConfig } from '@/types'

   export const QR_SOFT_LIMIT = 2700
   export const QR_HARD_LIMIT = 2953

   export function minifyConfigJson(config: ExportConfig): string {
     return JSON.stringify(JSON.parse(serializeForShare(config)))
   }

   export async function renderConfigQr(canvas: HTMLCanvasElement, config: ExportConfig): Promise<void> {
     const data = minifyConfigJson(config)
     await QRCode.toCanvas(canvas, data, {
       errorCorrectionLevel: 'M',
       color: { dark: '#4338ca', light: '#ffffff' },
       width: 280,
       margin: 2,
     })
   }
   ```
3. Verify build passes (TypeScript + Vite).

### Phase 2 — QrCodeDialog component

1. Create `src/components/configs/QrCodeDialog.tsx`:
   - Props: `open: boolean`, `config: ExportConfig | null`, `onClose: () => void`, `onDownloadJson: () => void`.
   - Renders inside `<AnimatePresence>` like other dialogs.
   - On open: call `renderConfigQr(canvasRef.current, config)` in a `useEffect`.
   - Size check against `QR_SOFT_LIMIT` / `QR_HARD_LIMIT` in the same effect.
   - "Download QR as PNG" and "Download JSON instead" buttons.
2. Wire into `ConfigsPage.tsx`:
   - Add `qrConfig: ExportConfig | null` state.
   - New `handleShowQr(id: string)` sets `qrConfig = getConfig(id)`.
   - Render `<QrCodeDialog open={!!qrConfig} config={qrConfig} onClose={() => setQrConfig(null)} onDownloadJson={() => { handleShare(qrConfig!.id); setQrConfig(null) }} />`.
3. Update `ConfigCard.tsx`:
   - Add `onShowQr: (id: string) => void` prop.
   - Replace single Share button with Download + QR buttons.
   - Import `Download` and `QrCode` from lucide-react.

**Acceptance**: clicking QR on any config shows a scannable QR; clicking Download JSON still downloads the file; Dishari built-in shows both options.

### Phase 3 — Camera scan in ImportConfigDialog

1. Extract inner dialog content into a sub-component with a `tab: 'file' | 'scan'` state.
2. Add `QrScanTab.tsx` (internal, or inline in the dialog):
   - On mount: call `navigator.mediaDevices.getUserMedia(...)`.
   - Render `<video autoPlay playsInline muted />` (hidden via CSS, used only for frame capture).
   - Render a styled `<canvas>` as the visible viewfinder (draw video frames to it each RAF tick).
   - Each frame: `jsQR(imageData.data, width, height)` → on hit → stop RAF + stop tracks → call `onDecoded(result.data)`.
   - Show pulsing border animation while scanning.
   - Permission-denied error state.
3. In `ImportConfigDialogInner`: when `onDecoded` fires → run `parseImported(text)` → same state path as `handleFile` (sets `parsed`, `name`, shows confirm step).
4. Tab switch and dialog close call `stream.getTracks().forEach(t => t.stop())`.

**Acceptance**: on a device with a camera, open Import → Scan QR tab → hold up the QR from Phase 2 → config preview appears → confirm saves the config.

### Phase 4 — Edge cases + polish

1. Large-config warning banner in `QrCodeDialog` (soft limit).
2. Hard-error fallback when `qrcode` throws.
3. "Already exists" duplicate handling — `parseImported` returns a valid config, `createConfig` returns null → surface the existing "name already taken" error from `handleImport`.
4. Tablet / desktop with front-facing camera only: `facingMode: 'environment'` constraint is specified as `ideal`, not `exact`, so it falls back gracefully.
5. Run `npm run build` and manually test round-trip: generate QR → scan → confirm.

### Phase 5 — Docs update

Per CLAUDE.md mandate:
1. Update `REQUIREMENTS.md` — add QR share/import to the Configs section under Data Management.
2. Update `Plan.md` — add Phase N for QR feature; reference new files.

---

## 4. Test Plan

### 4.1 `configToQr.test.ts` (new)

- `minifyConfigJson` output is valid JSON equal to `serializeForShare` content (no extra whitespace).
- `minifyConfigJson` output for Dishari config is ≤ 2953 bytes.
- Soft-limit detection: mock a config whose minified JSON is exactly 2700 bytes → expect size ≥ `QR_SOFT_LIMIT`.

### 4.2 `QrCodeDialog.test.tsx` (new)

- Renders canvas when config is valid.
- Shows soft-limit warning when JSON ≥ `QR_SOFT_LIMIT`.
- "Download JSON instead" calls `onDownloadJson`.
- Closes on Escape.

### 4.3 `ImportConfigDialog.test.tsx` (update)

- Renders two tabs: File and Scan QR.
- File tab: existing tests unchanged.
- Scan QR tab: when `getUserMedia` is rejected → shows permission-denied message.
- When `onDecoded` fires with valid JSON → transitions to confirm step.
- When `onDecoded` fires with invalid JSON → shows error, stays on scan step.
- Camera tracks stopped on tab switch.
- Camera tracks stopped on dialog close.

### 4.4 `ConfigCard.test.tsx` (update if exists, otherwise add)

- Renders Download and QR buttons (not a single Share button).
- `onShowQr` called with correct id.

### 4.5 Manual checklist

- Dishari config (39 cols, ~2600 bytes): QR generates, scans successfully on mobile.
- Custom config with 1 column: QR generates, scans.
- Duplicate import: scan QR of already-imported config → error "name already taken".
- Camera denied: Scan QR tab shows error message, File tab still works.
- Large config: manually construct config >2700 bytes → soft warning appears in QR dialog.
- Build passes: `npm run build` with no errors.

---

## 5. Files Touched

### New

| Path | Purpose |
|---|---|
| `src/utils/configToQr.ts` | Minify + render config to QR canvas |
| `src/components/configs/QrCodeDialog.tsx` | QR display modal |
| `src/utils/configToQr.test.ts` | Utility tests |
| `src/components/configs/QrCodeDialog.test.tsx` | Dialog tests |

### Modified

| Path | Change |
|---|---|
| `package.json` | Add `qrcode`, `jsqr`, `@types/qrcode`, `@types/jsqr` |
| `src/components/configs/ConfigCard.tsx` | Split Share → Download + QR buttons; add `onShowQr` prop |
| `src/components/configs/ConfigsPage.tsx` | Add `qrConfig` state; wire `QrCodeDialog`; pass `onShowQr` to cards |
| `src/components/configs/ImportConfigDialog.tsx` | Add File/Scan QR tabs; camera scan logic |
| `REQUIREMENTS.md` | Add QR share/import to Configs section |
| `Plan.md` | Add QR feature phase |

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Dishari config (~2600 bytes) is close to 2953-byte QR limit | Size checked at generate time; soft warning at 2700, hard error + fallback at limit |
| `getUserMedia` unavailable (HTTP, old browser) | Check `navigator.mediaDevices` existence before rendering scan tab; show "not supported" message |
| QR scanning slow on low-end devices | `jsqr` is sync per frame; if RAF loop lags, reduce canvas resolution (320×240 is sufficient for jsqr) |
| `qrcode` and `jsqr` add ~65 KB to bundle | Both are lazy-import candidates (`import()`) since they're only needed inside dialogs — load on dialog open |
| Camera permission UX varies by OS/browser | Always show "use File tab instead" as escape hatch; never block the file import path |

---

## 7. Out of Scope

- Sharing via URL (would require a backend or URL-length workarounds).
- QR code for book history export (separate feature).
- Animated/styled QR codes (keep high scan reliability).
- Batch QR for multiple configs.

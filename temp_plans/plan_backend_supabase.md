# Gronthee — Backend Migration: Supabase + Vercel Edge API

**Generated:** 2026-04-25
**Scope:** Multi-user support, server-side secrets, persistent cloud storage
**Target infra:** Supabase (free tier) · Vercel (free tier / Hobby) · Cloudflare R2 (free tier, stays)

---

## 1. Goal

1. Move all AI provider API keys and R2 credentials out of the browser (no more `VITE_` prefix for secrets).
2. Persist book data, sessions, and preferences in PostgreSQL (Supabase) so multiple users can use the app without sharing a browser.
3. Add user authentication (email + magic-link via Supabase Auth).
4. Keep the existing UX as intact as possible — this is a backend migration, not a redesign.

---

## 2. Architecture Overview

### Current (before)
```
Browser
  └─ React app
       ├─ localStorage  (books, sessions, configs, prefs)
       ├─ VITE_ANTHROPIC_API_KEY → direct Claude API call
       ├─ VITE_OPENAI_API_KEY   → direct OpenAI/OpenRouter call
       ├─ VITE_GEMINI_API_KEY   → direct Gemini call
       └─ VITE_CLOUDFLARE_R2_*  → direct R2 PUT
```

### After
```
Browser
  └─ React app
       ├─ Supabase JS client (anon key, safe with RLS)
       │    ├─ Auth (login, logout, session tokens)
       │    └─ DB reads/writes (books, sessions, configs, prefs) — RLS enforced server-side
       ├─ /api/scan  (Vercel Edge Function)
       │    └─ Anthropic / OpenAI / Gemini / OpenRouter call  ← keys stay server-side
       └─ /api/r2/presign  (Vercel Edge Function)
            └─ AWS Sig V4 presigned URL → browser PUT directly to R2  ← creds stay server-side

Vercel Edge Functions
  └─ ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY
  └─ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_KEY, etc.
  └─ SUPABASE_SERVICE_ROLE_KEY (for admin ops only — not exposed to browser)

Supabase
  └─ PostgreSQL (books, sessions, export_configs, profiles, preferences)
  └─ Auth (email + magic-link)
  └─ RLS policies (defense-in-depth)
```

---

## 3. Design Decisions

### 3.1 Supabase client from browser (not full REST proxy)

The user concern is exposing **secrets** (AI keys, R2 creds). Supabase's `anon` key is **designed to be public** — it is safe when Row Level Security (RLS) is enabled. Using the Supabase JS client directly from the browser for data operations (books, sessions, configs) is the canonical pattern and avoids building a redundant REST proxy for CRUD.

**Secrets that DO move server-side:**
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` → Vercel Edge Functions only
- `CLOUDFLARE_R2_*` credentials → Vercel Edge Function for presigned URL generation only

**Stays in browser (safe):**
- `VITE_SUPABASE_URL` — public
- `VITE_SUPABASE_ANON_KEY` — public, RLS prevents unauthorized access
- `VITE_CLOUDFLARE_R2_PUBLIC_URL` — public (read-only CDN URL, no auth)

### 3.2 R2 upload flow: presigned URL approach

Vercel Edge Functions cap request body at ~4 MB. Images can be up to 25 MB (before compression, ~1 MB after). Rather than routing image data through Vercel:

```
Browser → POST /api/r2/presign { bookId, count }
       ← { urls: [presigned PUT URL per image] }
Browser → PUT presigned URL directly to R2 (no server in the middle)
```

This keeps R2 credentials server-side while avoiding Vercel bandwidth and body-size limits. CORS on the R2 bucket stays as-is (already configured).

### 3.3 AI proxy: Edge Function with streaming

Edge Functions support the Web Streams API — they can pipe the AI provider's streaming response directly to the browser with no timeout issues on Vercel Hobby plan.

```
Browser → POST /api/scan { images, provider, modelId, pageCount? }
       ← Server-Sent Events / ReadableStream (streamed JSON response)
```

OpenAI, Anthropic, OpenRouter all support streaming. Gemini SDK also supports streaming. The existing `src/services/ai/*.ts` logic is moved to the Edge Function; the frontend switches from calling AI SDKs to calling `/api/scan`.

### 3.4 Supabase pausing mitigation

Free-tier Supabase projects pause after 1 week of inactivity. Mitigation: a daily Vercel Cron job (`/api/cron/keepalive`) runs a lightweight `SELECT 1` query to prevent pause. Vercel Hobby plan supports 2 cron jobs; this uses one.

### 3.5 localStorage migration

On first login, if the browser has existing `gronthee:books` data, the app offers a one-time import prompt: "You have N books in local storage. Import them to your account?" On confirm, a migration function reads all localStorage keys and writes the data to Supabase. After migration completes, localStorage keys are cleared. This is optional — user can dismiss and start fresh.

### 3.6 No tRPC, no Prisma

Friends-and-family scale. Supabase's auto-generated TypeScript types + client are sufficient. Adding an ORM or RPC layer adds complexity with no benefit at this scale.

---

## 4. Database Schema

### 4.1 Tables

```sql
-- Extended profile (auth.users is created by Supabase automatically)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username    text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id          text PRIMARY KEY,  -- URL-safe slug, e.g. "my-collection-2026"
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  config_id   text NOT NULL DEFAULT 'dishari',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- User-defined export configs
CREATE TABLE export_configs (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  columns     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Books
CREATE TABLE books (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id            text REFERENCES sessions(id) ON DELETE SET NULL,
  -- metadata (mirrors BookMetadata fields, snake_case)
  title                 text NOT NULL,
  sub_title             text,
  other_title           text,
  author                text,
  second_author         text,
  editor                text,
  translator            text,
  illustrator           text,
  publisher             text,
  published_year        text,
  published_year_bengali text,
  isbn                  text,
  category              text,
  genre                 text,
  collection            text,
  item_type             text,
  page_count            text,
  language              text,
  edition               text,
  publication_place     text,
  scan_date             text NOT NULL,
  summary               text,
  image_urls            jsonb,           -- string[]
  raw_ai_output         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- User preferences (one row per user)
CREATE TABLE user_preferences (
  user_id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  author_mappings jsonb NOT NULL DEFAULT '{}',
  selected_model  jsonb,               -- { provider, modelId }
  scanner_tab     text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### 4.2 Row Level Security

```sql
-- Profiles: owner only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Sessions: owner only
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Export configs: owner only
ALTER TABLE export_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON export_configs USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Books: owner only
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON books USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Preferences: owner only
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON user_preferences USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 4.3 Indexes

```sql
CREATE INDEX ON books(user_id);
CREATE INDEX ON books(session_id);
CREATE INDEX ON sessions(user_id);
CREATE INDEX ON export_configs(user_id);
```

---

## 5. Vercel Edge Functions (API Routes)

All routes live under `api/` in the project root (Vercel convention).

| Route | Method | Purpose | Auth required |
|-------|--------|---------|---------------|
| `api/scan.ts` | POST | AI proxy (streaming) | Yes |
| `api/r2/presign.ts` | POST | Generate R2 presigned PUT URLs | Yes |
| `api/cron/keepalive.ts` | GET | Ping Supabase to prevent pause | Cron (Vercel secret) |

Everything else (books, sessions, configs, prefs) goes through the Supabase JS client directly from the frontend — no Vercel Edge Function needed.

### 5.1 `/api/scan.ts`

```typescript
// Edge runtime
export const config = { runtime: 'edge' }

// Request body:
// { provider: string, modelId: string, images: string[] /* base64 */, prompt: string }

// Response: ReadableStream of SSE events
// event: data
// data: { type: 'chunk', text: string } | { type: 'done', result: RawBookMetadata } | { type: 'error', message: string }
```

Moves all of `src/services/ai/*.ts` server-side. Frontend sends images + prompt; Edge Function holds the API key and proxies the response as a stream.

### 5.2 `/api/r2/presign.ts`

```typescript
// Edge runtime
export const config = { runtime: 'edge' }

// Request body: { bookId: string, count: number }
// Response: { urls: string[] }  — one presigned PUT URL per image slot
// Each URL is valid for 5 minutes.
```

Uses `aws4fetch` (already a dependency) with credentials from Vercel env vars to generate `PutObject` presigned URLs. The browser then does `PUT presignedUrl` directly to R2 — no image data touches Vercel.

### 5.3 `/api/cron/keepalive.ts`

Runs daily via Vercel Cron (configured in `vercel.json`). Executes `SELECT 1` against Supabase using the service role key. Vercel verifies the `CRON_SECRET` header.

---

## 6. New Environment Variables

### Server-side only (Vercel, no VITE_ prefix)
```
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
OPENROUTER_API_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_KEY
CLOUDFLARE_R2_BUCKET_NAME
SUPABASE_SERVICE_ROLE_KEY   (for keepalive cron + any future admin ops)
CRON_SECRET                 (Vercel cron auth)
```

### Client-side (Vercel + `.env.local`, VITE_ prefix)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLOUDFLARE_R2_PUBLIC_URL   (already exists, public CDN URL only)
```

### Remove (were exposed, no longer needed in browser)
```
VITE_ANTHROPIC_API_KEY
VITE_OPENAI_API_KEY
VITE_GEMINI_API_KEY
VITE_OPENROUTER_API_KEY
VITE_CLOUDFLARE_ACCOUNT_ID
VITE_CLOUDFLARE_R2_ACCESS_KEY_ID
VITE_CLOUDFLARE_R2_API_KEY
VITE_CLOUDFLARE_R2_BUCKET_NAME
```

---

## 7. Frontend Changes

### 7.1 New files

| Path | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client singleton (`createClient(url, anon)`) |
| `src/lib/supabase-types.ts` | Generated DB types (via `supabase gen types typescript`) |
| `src/hooks/useAuth.ts` | Auth state, login, logout, session |
| `src/hooks/useProfile.ts` | Profile CRUD (username, etc.) |
| `src/components/auth/LoginPage.tsx` | Email + magic-link login |
| `src/components/auth/AuthCallback.tsx` | Magic-link redirect handler |
| `src/components/auth/AuthGuard.tsx` | Wrapper that redirects to login if not authed |
| `src/components/shared/LocalStorageMigrationDialog.tsx` | One-time import offer on first login |

| `api/scan.ts` | AI proxy Edge Function |
| `api/r2/presign.ts` | R2 presigned URL Edge Function |
| `api/cron/keepalive.ts` | Supabase keepalive cron |
| `vercel.json` | Cron config + edge function routing |
| `src/lib/db-mappers.ts` | camelCase ↔ snake_case + userId helpers for all tables |

### 7.2 Modified files

| Path | Change |
|------|--------|
| `src/hooks/useBookHistory.ts` | Replace localStorage with Supabase `books` table |
| `src/hooks/useSessions.ts` | Replace localStorage with Supabase `sessions` table |
| `src/hooks/useExportConfigs.ts` | Replace localStorage with Supabase `export_configs` table |
| `src/hooks/useUserPreferences.ts` | Replace localStorage with Supabase `user_preferences` table |
| `src/services/r2Storage.ts` | Replace direct upload with `/api/r2/presign` + browser PUT |
| `src/services/ai/*.ts` | Replace direct AI SDK calls with `/api/scan` fetch + stream reader |
| `src/components/scanner/ModelSelector.tsx` | Remove API key env var reads (keys are now server-side) |
| `src/components/layout/AppShell.tsx` | Add auth state; show login if not authenticated; "Reset" becomes "Sign out" + data reset |
| `src/components/shared/UsernameDialog.tsx` | Replace localStorage username with Supabase profile on signup only |
| `src/App.tsx` | Add `AuthGuard`; initialize Supabase client; thread auth state |

### 7.3 Hooks rewrite pattern

All four data hooks follow the same pattern:

```typescript
// Before (localStorage)
const [books, setBooks] = useState<BookMetadata[]>(() => loadFromLocalStorage())

// After (Supabase)
const [books, setBooks] = useState<BookMetadata[]>([])
const supabase = useSupabase()

useEffect(() => {
  supabase.from('books').select('*').then(({ data }) => setBooks(data ?? []))
}, [supabase])

async function addBook(book: BookMetadata) {
  const { data } = await supabase.from('books').insert(toRow(book)).select().single()
  setBooks(prev => [...prev, fromRow(data)])
}
```

Field name mapping (camelCase ↔ snake_case) is handled by `toRow` / `fromRow` helpers per data type.

---

## 8. Auth Flow

### Sign up
1. User opens app → `AuthGuard` redirects to `LoginPage`
2. User enters email → Supabase sends magic-link
3. User clicks link → app callback at `/auth/callback` → `AuthCallback` exchanges token
4. On first login: `profiles` row doesn't exist → `UsernameDialog` opens, user sets username → `profiles` upsert
5. If localStorage has data: `LocalStorageMigrationDialog` appears
6. Redirect to Scan page

### Sign in (returning user)
1. Email → magic-link → callback → auth session restored
2. Skip username dialog (profile exists), skip migration dialog (already migrated or dismissed)

### Session persistence
Supabase JS client persists the JWT in localStorage automatically. No custom token handling needed.

---

## 9. LocalStorage Migration

```typescript
async function migrateLocalStorageToSupabase(userId: string, supabase: SupabaseClient) {
  const books = JSON.parse(localStorage.getItem('gronthee:books') ?? '[]')
  const sessions = JSON.parse(localStorage.getItem('gronthee:sessions') ?? '[]')
  const configs = JSON.parse(localStorage.getItem('gronthee:exportConfigs') ?? '[]')
  const prefs = {
    authorMappings: JSON.parse(localStorage.getItem('gronthee:preferences') ?? '{}'),
    selectedModel: JSON.parse(localStorage.getItem('gronthee:selectedModel') ?? 'null'),
  }

  // Insert sessions first (books reference sessions)
  if (sessions.length) await supabase.from('sessions').upsert(sessions.map(s => toSessionRow(s, userId)))
  if (books.length) await supabase.from('books').upsert(books.map(b => toBookRow(b, userId)))
  if (configs.length) await supabase.from('export_configs').upsert(configs.map(c => toConfigRow(c, userId)))
  await supabase.from('user_preferences').upsert(toPrefsRow(prefs, userId))

  // Clear localStorage after successful migration
  LOCALSTORAGE_KEYS.forEach(k => localStorage.removeItem(k))
}
```

If any step fails, the error is shown and localStorage is NOT cleared — user can retry.

---

## 10. Streaming AI Responses

The Edge Function (`/api/scan`) uses the AI SDK streaming APIs and pipes to a `TransformStream`. The frontend replaces the current direct SDK call with:

```typescript
const response = await fetch('/api/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
  body: JSON.stringify({ provider, modelId, images, prompt }),
})

const reader = response.body!.getReader()
// Read chunks → accumulate text → parse final JSON when 'done' event received
```

The existing loading UI (spinner, streamed text display) remains unchanged.

---

## 11. Public Session Sharing

Sessions have a `visibility` field. When `public`:
- The session's books are readable by anyone (unauthenticated via RLS policy)
- A shareable link is generated: `https://gronthee.app/public/{userId}/{sessionId}`
- The `PublicSessionPage` (read-only) shows all books in that session in a clean list view

Toggling visibility is a simple toggle in the Session rename/edit UI (a lock/unlock icon).

---

## 12. Implementation Phases

Each phase ends in a deployable, working app. Run `npm run build` after every phase.

---

### Phase 0 — Supabase project setup (manual + migrations)

**Goal**: DB schema exists; Supabase client can connect; no app changes yet.

1. Create Supabase project at supabase.com.
2. Run SQL from §4 to create tables + RLS policies + indexes.
3. Enable "Email (Magic Link)" provider in Supabase Auth settings; disable email confirm requirement for dev.
4. Note `SUPABASE_URL` and `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` and Vercel env vars.
6. Run `npx supabase gen types typescript --project-id <id> > src/lib/supabase-types.ts` (one-time for now; re-run when schema changes).

**Deliverable**: `src/lib/supabase-types.ts` committed; Supabase project live; app is unchanged.

---

### Phase 1 — Auth (login/logout)

**Goal**: App requires login; auth state is available everywhere; existing users migrated.

1. `npm install @supabase/supabase-js`
2. Create `src/lib/supabase.ts` — client singleton.
3. Create `src/hooks/useAuth.ts` — wraps `supabase.auth.getSession()`, `onAuthStateChange`, exposes `{ user, session, signIn, signOut, loading }`.
4. Create `src/components/auth/LoginPage.tsx` — email input → `supabase.auth.signInWithOtp({ email })` → "Check your email" state.
5. Create `src/components/auth/AuthCallback.tsx` — handles `/auth/callback` route; exchanges code for session via `supabase.auth.exchangeCodeForSession`.
6. Add `/auth/callback` route to `App.tsx` router.
7. Create `src/components/auth/AuthGuard.tsx` — if `!user && !loading`, redirect to `/login`.
8. Wrap all existing pages in `AuthGuard`.
9. Replace `UsernameDialog` with profile creation: on first login (no `profiles` row), show username prompt → `supabase.from('profiles').insert(...)`.
10. Add Sign Out to the footer/AppShell (next to Reset Data).

**Acceptance**: unauthenticated access redirects to login; magic-link flow works end-to-end; sign out clears session.

---

### Phase 2 — Data layer: sessions + books

**Goal**: Books and sessions read/write from Supabase instead of localStorage.

1. Add `toBookRow` / `fromBookRow` helpers in `src/lib/db-mappers.ts` (camelCase ↔ snake_case + userId injection).
2. Rewrite `src/hooks/useBookHistory.ts`:
   - On mount: `supabase.from('books').select('*').order('created_at', { ascending: false })`.
   - `addBook`: insert row, optimistic update.
   - `updateBook`: update row, optimistic update.
   - `deleteBook`: delete row, optimistic update.
   - Subscribe to Supabase realtime for the user's books (optional but useful for multi-device).
3. Add `toSessionRow` / `fromSessionRow` to `src/lib/db-mappers.ts`.
4. Rewrite `src/hooks/useSessions.ts`:
   - On mount: `supabase.from('sessions').select('*')`.
   - Upsert default session if none exist.
   - `createSession`, `renameSession`, `deleteSession`: DB ops + optimistic state.
   - `currentSessionId` persists to `localStorage` only (it's UI state, not data — no need for DB).
5. Add `LocalStorageMigrationDialog` — shown once on first login if `gronthee:books` exists in localStorage.

**Acceptance**: new books appear in DB; sessions persist across browsers; existing test suite still passes (hooks are mocked in tests).

---

### Phase 3 — Data layer: export configs + preferences

**Goal**: Export configs and user preferences in Supabase.

1. Rewrite `src/hooks/useExportConfigs.ts`:
   - User configs from `supabase.from('export_configs').select('*')`.
   - Dishari built-in stays bundled (not in DB, merged client-side as before).
   - `createConfig`, `updateConfig`, `deleteConfig`: DB ops.
2. Rewrite `src/hooks/useUserPreferences.ts`:
   - On mount: `supabase.from('user_preferences').select('*').eq('user_id', user.id).single()`.
   - `updatePreferences`: upsert.
3. Remove these keys from the Reset Data sweep (data now lives in Supabase; Reset Data should delete the user's Supabase rows instead, or keep it as "sign out + clear local cache").

**Acceptance**: export configs survive browser refresh + new device; author preference corrections survive.

---

### Phase 4 — AI proxy (Edge Function)

**Goal**: AI API keys no longer in browser; streaming still works.

1. Create `api/scan.ts` (Vercel Edge Function):
   - Authenticate request via `Authorization: Bearer <supabase_jwt>` header — verify with `SUPABASE_SERVICE_ROLE_KEY` or Supabase's `auth.getUser(token)` API.
   - Accept `{ provider, modelId, images, prompt }`.
   - Route to the appropriate AI SDK call (Anthropic / OpenAI / Gemini / OpenRouter).
   - Stream response back using `TransformStream`.
   - AI API keys read from Vercel env vars (no `VITE_` prefix).
2. Update `src/services/ai/*.ts` (or create `src/services/ai/proxy.ts`):
   - Replace direct SDK calls with `fetch('/api/scan', { ... })`.
   - Read streaming response, emit the same callbacks as before.
3. Remove `VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_OPENROUTER_API_KEY` from Vercel env vars.
4. Update `src/config/ai-config.ts` to remove API key reading — keys are server-only now.
5. Remove `ModelSelector.tsx`'s API key validation logic.

**Acceptance**: scanning works; no AI API keys appear in browser network traffic; Vercel function logs show AI calls.

---

### Phase 5 — R2 presigned upload

**Goal**: R2 credentials no longer in browser; upload still works.

1. Create `api/r2/presign.ts` (Vercel Edge Function):
   - Authenticate request (same as `/api/scan`).
   - Accept `{ bookId: string, count: number }`.
   - Generate `count` presigned PUT URLs using `aws4fetch` (already a dep) with server-side R2 credentials.
   - Return `{ urls: string[] }`.
2. Update `src/services/r2Storage.ts`:
   - Replace direct `AwsClient` PUT with: call `/api/r2/presign` → get URLs → `fetch(presignedUrl, { method: 'PUT', body: blob })`.
   - Remove `AwsClient` instantiation from browser code.
3. Remove `VITE_CLOUDFLARE_ACCOUNT_ID`, `VITE_CLOUDFLARE_R2_ACCESS_KEY_ID`, `VITE_CLOUDFLARE_R2_API_KEY`, `VITE_CLOUDFLARE_R2_BUCKET_NAME` from Vercel env vars.
4. Add server-side `CLOUDFLARE_*` env vars to Vercel.
5. `VITE_CLOUDFLARE_R2_PUBLIC_URL` stays — it's the public read CDN URL only, no credentials.

**Acceptance**: image upload works; no R2 credentials in browser; R2 objects appear at correct public URLs.

---

### Phase 6 — Supabase keepalive cron

**Goal**: Free-tier project doesn't pause.

1. Create `api/cron/keepalive.ts`:
   - Verify `Authorization: Bearer ${process.env.CRON_SECRET}`.
   - Run `supabase.from('profiles').select('count').limit(1)`.
   - Return `{ ok: true }`.
2. Add to `vercel.json`:
   ```json
   {
     "crons": [{ "path": "/api/cron/keepalive", "schedule": "0 12 * * *" }]
   }
   ```
3. Add `CRON_SECRET` to Vercel env vars.

**Acceptance**: Vercel cron runs daily; Supabase project stays active.

---

### Phase 7 — Cleanup + docs

1. Delete unused env vars from Vercel dashboard and `.env.local.example`.
2. Update `REQUIREMENTS.md`: auth, multi-user, public/private, server-side keys.
3. Update `Plan.md`: add Phase 9 (this migration) to the completed phases list.
4. Run `npm run build` — verify no stray `import.meta.env.VITE_ANTHROPIC_API_KEY` references.
5. Run `npx supabase gen types typescript` to refresh generated types.

---

## 13. Supabase Free Tier Constraints

| Limit | Value | Our usage |
|-------|-------|-----------|
| DB size | 500 MB | ~1 KB/book → ~500K books before limit |
| MAU (Monthly Active Users) | 50,000 | Far above friends-and-family scale |
| Storage (Supabase Storage) | 1 GB | Not used (R2 for images) |
| Edge Function invocations | 500K/month | Fine |
| Project pause | After 1 week idle | Mitigated by keepalive cron |
| Projects per free account | 2 | Use 1 for prod, 1 for dev/staging |

---

## 14. New Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `@supabase/supabase-js` | Frontend + API | DB client + auth |

No new backend-only deps — `aws4fetch` is already installed; AI SDKs move to the Edge Function but the same packages are used.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Supabase project pauses in production | Keepalive cron (Phase 7) |
| Magic-link email goes to spam | Supabase sends from their domain; tell users to check spam; option to add custom SMTP later |
| Edge Function cold start adds latency to first scan | Cold starts on Edge are ~50ms, not noticeable for a scan flow |
| `aws4fetch` presigned URLs expire mid-upload | 5-minute expiry; images upload in seconds; no real risk |
| localStorage migration corrupts DB data | Migration is additive (upsert); failures don't clear localStorage; user can retry |
| RLS misconfiguration exposes private data | Keep RLS policies in a `supabase/migrations/` folder and review before applying; always test as anon role |
| Vercel hobby timeout on `/api/scan` | Edge Runtime has no timeout (vs. 10s on Serverless); streaming response keeps connection alive |
| Multi-user session ID collisions | Session IDs are scoped to `user_id` — two users can have the same slug without conflict |

---

## 16. Out of Scope (follow-ups)

- **Public/private collections** — a new first-class concept (separate from sessions) with its own visibility model; planned as a future phase
- OAuth login (Google, GitHub) — Supabase supports it; add when needed
- Shared editing (collaborators on a session) — needs more complex RLS + invites
- Full-text search across books — Supabase supports pg_trgm; add as follow-up
- Book deletion also deletes R2 objects — still deferred (same as original R2 plan)
- Offline mode / service worker — significant scope; deferred
- Admin dashboard — deferred
- Custom SMTP for magic-link emails — configure in Supabase dashboard when needed

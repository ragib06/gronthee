-- Per-user session ids: each user can independently own id='default',
-- 'fiction', etc. without colliding with other users.

-- 1. Drop existing single-column PK + FK
ALTER TABLE books    DROP CONSTRAINT books_session_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT sessions_pkey;

-- 2. New composite PK (user_id, id)
ALTER TABLE sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (user_id, id);

-- 3. Backfill: for any book whose (user_id, session_id) does not yet
--    have a matching sessions row, create one. Picks up books that
--    were saved while another user owned the previously-shared id.
INSERT INTO sessions (id, user_id, name, config_id)
SELECT DISTINCT
  b.session_id,
  b.user_id,
  CASE WHEN b.session_id = 'default' THEN 'Default' ELSE initcap(b.session_id) END,
  'dishari'
FROM books b
WHERE b.session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.user_id = b.user_id AND s.id = b.session_id
  );

-- 4. New composite FK so books.session_id references the same user's session row
ALTER TABLE books
  ADD CONSTRAINT books_session_id_fkey
  FOREIGN KEY (user_id, session_id)
  REFERENCES sessions (user_id, id)
  ON DELETE SET NULL;

-- Extended profile (auth.users is created by Supabase automatically)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username    text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id          text PRIMARY KEY,
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
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id             text REFERENCES sessions(id) ON DELETE SET NULL,
  title                  text NOT NULL,
  sub_title              text,
  other_title            text,
  author                 text,
  second_author          text,
  editor                 text,
  translator             text,
  illustrator            text,
  publisher              text,
  published_year         text,
  published_year_bengali text,
  isbn                   text,
  category               text,
  genre                  text,
  collection             text,
  item_type              text,
  page_count             text,
  language               text,
  edition                text,
  publication_place      text,
  scan_date              text NOT NULL,
  summary                text,
  image_urls             jsonb,
  raw_ai_output          text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- User preferences (one row per user)
CREATE TABLE user_preferences (
  user_id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  author_mappings jsonb NOT NULL DEFAULT '{}',
  selected_model  jsonb,
  scanner_tab     text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE books           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON profiles        USING (auth.uid() = id)          WITH CHECK (auth.uid() = id);
CREATE POLICY "owner" ON sessions        USING (auth.uid() = user_id)     WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner" ON export_configs  USING (auth.uid() = user_id)     WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner" ON books           USING (auth.uid() = user_id)     WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner" ON user_preferences USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX ON books(user_id);
CREATE INDEX ON books(session_id);
CREATE INDEX ON sessions(user_id);
CREATE INDEX ON export_configs(user_id);

-- Run once in Supabase Dashboard → SQL Editor (free tier is enough for 3 players)

CREATE TABLE IF NOT EXISTS league_state (
    app_id TEXT PRIMARY KEY,
    scores JSONB NOT NULL DEFAULT '{}',
    selections JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE league_state ENABLE ROW LEVEL SECURITY;

-- Simple shared-league access (keep your app_id private in config.js)
CREATE POLICY "league_read" ON league_state FOR SELECT USING (true);
CREATE POLICY "league_write" ON league_state FOR INSERT WITH CHECK (true);
CREATE POLICY "league_update" ON league_state FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE league_state;

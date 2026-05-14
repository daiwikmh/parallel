PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  attributes TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(canonical_name);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'anon',
  query_text TEXT NOT NULL,
  entity_id TEXT REFERENCES entities(id),
  entity_type TEXT,
  thesis TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  paused_at INTEGER,
  dropped_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_commissions_owner ON commissions(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_entity ON commissions(entity_id);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  url TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  source_kind TEXT,
  source_name TEXT,
  published_at INTEGER,
  fetched_at INTEGER NOT NULL,
  body TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);

CREATE TABLE IF NOT EXISTS edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  src_id TEXT NOT NULL REFERENCES entities(id),
  dst_id TEXT NOT NULL REFERENCES entities(id),
  type TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  effective_at INTEGER,
  t_end INTEGER,
  properties TEXT NOT NULL DEFAULT '{}',
  evidence TEXT,
  article_id TEXT REFERENCES articles(id),
  trace_id TEXT,
  confidence REAL NOT NULL DEFAULT 1.0,
  commission_id TEXT REFERENCES commissions(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src_id, type, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst_id, type, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_edges_commission ON edges(commission_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_edges_article ON edges(article_id);

CREATE TABLE IF NOT EXISTS traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  kind TEXT NOT NULL,
  total_cost_wei TEXT,
  payload TEXT,
  commission_id TEXT REFERENCES commissions(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traces_request ON traces(request_id);
CREATE INDEX IF NOT EXISTS idx_traces_commission ON traces(commission_id, created_at DESC);

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

CREATE TABLE IF NOT EXISTS article_entities (
  article_id TEXT NOT NULL REFERENCES articles(id),
  entity_id TEXT NOT NULL REFERENCES entities(id),
  PRIMARY KEY (article_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_ae_article ON article_entities(article_id);
CREATE INDEX IF NOT EXISTS idx_ae_entity ON article_entities(entity_id);

CREATE TABLE IF NOT EXISTS commission_articles (
  commission_id TEXT NOT NULL REFERENCES commissions(id),
  article_id TEXT NOT NULL REFERENCES articles(id),
  processed_at INTEGER NOT NULL,
  PRIMARY KEY (commission_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_ca_commission ON commission_articles(commission_id, processed_at DESC);

CREATE TABLE IF NOT EXISTS briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commission_id TEXT NOT NULL REFERENCES commissions(id),
  article_id TEXT REFERENCES articles(id),
  body_md TEXT NOT NULL,
  trace_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_briefs_commission ON briefs(commission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS entity_aliases (
  alias_lower TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_aliases_entity ON entity_aliases(entity_id);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commission_id TEXT NOT NULL REFERENCES commissions(id),
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  preference INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  last_fetched_at INTEGER,
  last_item_count INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sources_commission ON sources(commission_id, active);

CREATE TABLE IF NOT EXISTS delivery_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channels_owner ON delivery_channels(owner_id, active);

CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commission_id TEXT NOT NULL REFERENCES commissions(id),
  kind TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  channel_ids TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  cooldown_seconds INTEGER NOT NULL DEFAULT 3600,
  last_fired_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_commission ON alert_rules(commission_id, active);

CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL REFERENCES alert_rules(id),
  payload TEXT NOT NULL,
  delivered_to TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_events_rule ON alert_events(rule_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_access (
  wallet_lower TEXT PRIMARY KEY,
  free_uses_consumed INTEGER NOT NULL DEFAULT 0,
  paid_until INTEGER,
  paid_commission_ids TEXT NOT NULL DEFAULT '[]',
  last_payment_tx TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_free_uses (
  user_email TEXT PRIMARY KEY,
  uses_consumed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  commission_id TEXT NOT NULL REFERENCES commissions(id),
  filename TEXT NOT NULL,
  mime TEXT,
  size INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  storage_uri TEXT,
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_processed INTEGER NOT NULL DEFAULT 0,
  entities_added INTEGER NOT NULL DEFAULT 0,
  edges_added INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uploads_commission ON uploads(commission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_sha ON uploads(content_sha256);

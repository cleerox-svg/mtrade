-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Allowed emails table (invite-only access control)
CREATE TABLE IF NOT EXISTS allowed_emails (
  email TEXT PRIMARY KEY,
  role TEXT DEFAULT 'super_admin'
);

-- Seed allowed emails
INSERT INTO allowed_emails (email, role) VALUES ('cleerox@gmail.com', 'super_admin');
INSERT INTO allowed_emails (email, role) VALUES ('mleerox91@gmail.com', 'super_admin');

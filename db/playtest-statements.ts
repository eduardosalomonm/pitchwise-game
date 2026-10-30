// Shared by the Worker and SQLite tests. One statement per D1.prepare call.
export const playtestSql = {
  authorizeActive:
    'SELECT id, alias, created_at FROM playtest_sessions WHERE token_hash = ? AND expires_at > ?',
  authorizeAny:
    'SELECT id, alias, created_at FROM playtest_sessions WHERE token_hash = ?',
  ensureDailyLimit:
    'INSERT OR IGNORE INTO playtest_daily_limits (day, creations) VALUES (?, 0)',
  createSession:
    'INSERT INTO playtest_sessions (id, alias, token_hash, consent_version, ip_consent, ip_address, created_at, expires_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT creations FROM playtest_daily_limits WHERE day = ?) < 2000',
  consumeDailyLimit:
    'UPDATE playtest_daily_limits SET creations = creations + 1 WHERE day = ? AND EXISTS (SELECT 1 FROM playtest_sessions WHERE id = ?)',
  insertEvent:
    'INSERT OR IGNORE INTO playtest_events (id, session_id, type, payload, occurred_at, received_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM playtest_sessions WHERE id = ? AND expires_at > ?) AND (SELECT COUNT(*) FROM playtest_events WHERE session_id = ?) < ?',
  deleteSession: 'DELETE FROM playtest_sessions WHERE id = ?',
  purgeSessions: 'DELETE FROM playtest_sessions WHERE expires_at <= ?',
  purgeLimits: 'DELETE FROM playtest_daily_limits WHERE day < ?',
};

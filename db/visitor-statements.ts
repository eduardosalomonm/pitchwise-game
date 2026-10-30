// Invited-tester tracking. Shared by the Worker and SQLite tests; one statement per prepare.
export const visitorSql = {
  ensureDaily:
    'INSERT OR IGNORE INTO visitor_daily_limits (day, sessions, events) VALUES (?, 0, 0)',
  sessionVisitor: 'SELECT visitor_id FROM visitor_sessions WHERE id = ?',
  // A new tab session is created once, within the global daily cap.
  createSession:
    'INSERT OR IGNORE INTO visitor_sessions (id, visitor_id, label, device, language, referrer, country, region, city, timezone, created_at, last_seen_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT sessions FROM visitor_daily_limits WHERE day = ?) < ?',
  // Must immediately follow createSession in the same sequential D1 batch.
  countSession:
    'UPDATE visitor_daily_limits SET sessions = sessions + 1 WHERE day = ? AND changes() = 1',
  touchSession:
    'UPDATE visitor_sessions SET last_seen_at = ?, label = COALESCE(label, ?) WHERE id = ?',
  // Idempotent by event ID; refuses rows past the daily or per-session caps.
  insertEvent:
    'INSERT OR IGNORE INTO visitor_events (id, session_id, type, payload, occurred_at, received_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM visitor_sessions WHERE id = ?) AND (SELECT events FROM visitor_daily_limits WHERE day = ?) < ? AND (SELECT COUNT(*) FROM visitor_events WHERE session_id = ?) < ?',
  // Must immediately follow insertEvent: an ignored duplicate changes zero rows.
  countEvent:
    'UPDATE visitor_daily_limits SET events = events + 1 WHERE day = ? AND changes() = 1',
  purgeSessions: 'DELETE FROM visitor_sessions WHERE created_at <= ?',
  deleteVisitor:
    'DELETE FROM visitor_sessions WHERE visitor_id = ? RETURNING id',
  purgeLimits: 'DELETE FROM visitor_daily_limits WHERE day < ?',
  reportSessions:
    'SELECT id, visitor_id, label, device, language, referrer, country, region, city, timezone, created_at, last_seen_at FROM visitor_sessions WHERE last_seen_at > ? AND created_at > ? ORDER BY last_seen_at DESC LIMIT ?',
  reportEvents:
    'SELECT e.session_id, e.payload, e.received_at FROM visitor_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE s.last_seen_at > ? AND s.created_at > ? AND e.received_at > ? ORDER BY e.received_at DESC, e.rowid DESC LIMIT ?',
  visitorSessions:
    'SELECT id, visitor_id, label, device, language, referrer, country, region, city, timezone, created_at, last_seen_at FROM visitor_sessions WHERE visitor_id = ? AND created_at > ? ORDER BY created_at',
  visitorEvents:
    'SELECT e.session_id, e.payload, e.received_at FROM visitor_events e JOIN visitor_sessions s ON s.id = e.session_id WHERE s.visitor_id = ? AND s.created_at > ? ORDER BY e.received_at DESC, e.rowid DESC LIMIT 3001',
};

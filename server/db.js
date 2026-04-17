const Database = require('better-sqlite3');
const db = new Database('checkmate.db');

// ── Existing violations table ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machineId TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

// ── Student sessions table ────────────────────────────────────────────────────
// One row per machine. Tracks live score (starts at 100), status, and penalty log.
db.exec(`
  CREATE TABLE IF NOT EXISTS student_sessions (
    machine_id      TEXT PRIMARY KEY,
    current_score   INTEGER NOT NULL DEFAULT 100,
    status          TEXT    NOT NULL DEFAULT 'active',
    penalty_history TEXT    NOT NULL DEFAULT '[]'
  )
`);

// ── Violations helpers ─────────────────────────────────────────────────────────
function saveViolation(machineId, type, timestamp) {
  db.prepare(`
    INSERT INTO violations (machineId, type, timestamp)
    VALUES (?, ?, ?)
  `).run(machineId, type, timestamp);
}

function getViolations() {
  return db.prepare('SELECT * FROM violations ORDER BY id DESC').all();
}

function clearViolations() {
  db.exec('DELETE FROM violations');
}

// ── Session helpers ────────────────────────────────────────────────────────────

/** Ensure a session row exists for the given machine (idempotent). */
function upsertSession(machineId) {
  db.prepare(`
    INSERT OR IGNORE INTO student_sessions (machine_id, current_score, status, penalty_history)
    VALUES (?, 100, 'active', '[]')
  `).run(machineId);
}

/**
 * Deduct marks from a student's score.
 * @param {string} machineId
 * @param {number} deduction  Positive number of marks to subtract
 * @param {string} reason     Human-readable reason for the deduction
 * @returns {object} Updated session row
 */
function applyPenalty(machineId, deduction, reason) {
  upsertSession(machineId);

  const session = db.prepare('SELECT * FROM student_sessions WHERE machine_id = ?').get(machineId);
  const history = JSON.parse(session.penalty_history || '[]');

  const newScore = Math.max(0, session.current_score - deduction);
  const entry = {
    reason,
    deduction,
    score_after: newScore,
    timestamp: new Date().toLocaleString('en-IN')
  };
  history.push(entry);

  db.prepare(`
    UPDATE student_sessions
    SET current_score = ?, penalty_history = ?
    WHERE machine_id = ?
  `).run(newScore, JSON.stringify(history), machineId);

  return { ...session, current_score: newScore, penalty_history: history };
}

/** Fetch a single session row (returns null if not found). */
function getSession(machineId) {
  upsertSession(machineId);
  const row = db.prepare('SELECT * FROM student_sessions WHERE machine_id = ?').get(machineId);
  if (!row) return null;
  return { ...row, penalty_history: JSON.parse(row.penalty_history || '[]') };
}

/** Update the status of a session: 'active' | 'paused' | 'terminated' */
function setStatus(machineId, status) {
  upsertSession(machineId);
  db.prepare(`UPDATE student_sessions SET status = ? WHERE machine_id = ?`).run(status, machineId);
}

/** Fetch all sessions (for admin dashboard initial load). */
function getAllSessions() {
  return db.prepare('SELECT * FROM student_sessions').all().map(row => ({
    ...row,
    penalty_history: JSON.parse(row.penalty_history || '[]')
  }));
}

/** Reset all sessions back to fresh state (called on exam reset). */
function clearSessions() {
  db.exec('DELETE FROM student_sessions');
}

module.exports = {
  saveViolation,
  getViolations,
  clearViolations,
  upsertSession,
  applyPenalty,
  getSession,
  setStatus,
  getAllSessions,
  clearSessions
};
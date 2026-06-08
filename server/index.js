const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/student.html'));
});

// ── Penalty code → deduction mapping ─────────────────────────────────────────
// penalty_code: 1 = Tab Switch (-5), 2 = USB (-10), 3 = WiFi/Hotspot (-15)
const PENALTY_MAP = {
  1: { deduction: 5,  label: 'Tab Switch'         },
  2: { deduction: 10, label: 'USB Device'          },
  3: { deduction: 15, label: 'Unauthorized WiFi'   }
};

// ── Violation alert endpoint (Python agent + student frontend) ─────────────────
app.post('/alert', (req, res) => {
  // Accept both new (machine_id, violation_type, penalty_code) and legacy (machineId, type) fields
  const machineId  = req.body.machineId    || req.body.machine_id;
  const type       = req.body.type         || req.body.violation_type || 'Unknown';
  const penaltyCode = req.body.penalty_code ? Number(req.body.penalty_code) : null;
  const timestamp  = req.body.timestamp    || new Date().toLocaleString('en-IN');

  // Save violation log
  db.saveViolation(machineId, type, timestamp);

  // Apply score penalty if a valid penalty_code was provided
  let scorePayload = null;
  if (penaltyCode && PENALTY_MAP[penaltyCode]) {
    const { deduction, label } = PENALTY_MAP[penaltyCode];
    const session = db.applyPenalty(machineId, deduction, label);

    scorePayload = {
      machineId,
      current_score:   session.current_score,
      deduction,
      reason:          label,
      penalty_history: session.penalty_history
    };

    // Emit score_update to the specific student's room
    io.to(`room_${machineId}`).emit('score_update', scorePayload);
    console.log(`📉 Penalty: ${machineId} | ${label} | -${deduction} | Score: ${session.current_score}`);
  }

  // Broadcast violation to ALL admin dashboards
  io.emit('violation', { machineId, type, timestamp, scorePayload });

  console.log(`🚨 Violation: ${machineId} | ${type} | ${timestamp}`);
  res.json({ status: 'alert received', scorePayload });
});

// ── Past violations (admin dashboard load) ─────────────────────────────────────
app.get('/violations', (req, res) => {
  res.json(db.getViolations());
});

// ── All sessions (admin dashboard load - scores + statuses) ───────────────────
app.get('/sessions', (req, res) => {
  res.json(db.getAllSessions());
});

// ── Single session (student page load) ────────────────────────────────────────
app.get('/session/:machineId', (req, res) => {
  const session = db.getSession(req.params.machineId);
  res.json(session || { machine_id: req.params.machineId, current_score: 100, status: 'active', penalty_history: [] });
});

// ── Reset endpoint ─────────────────────────────────────────────────────────────
app.post('/reset', (req, res) => {
  db.clearViolations();
  db.clearSessions();
  io.emit('reset');
  console.log('🔄 Exam reset!');
  res.json({ status: 'reset done' });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Student joins their named room so admin messages can target them exactly
  socket.on('join_room', ({ machineId }) => {
    socket.join(`room_${machineId}`);
    console.log(`🏠 ${machineId} joined room_${machineId}`);
  });

  // ── Admin → Student: Warn ──────────────────────────────────────────────────
  socket.on('admin_warn', ({ machineId, message }) => {
    io.to(`room_${machineId}`).emit('warn_student', { message });
    console.log(`📢 Warn sent to ${machineId}: "${message}"`);
  });

  // ── Admin → Student: Pause ──────────────────────────────────────────────────
  socket.on('admin_pause', ({ machineId }) => {
    db.setStatus(machineId, 'paused');
    io.to(`room_${machineId}`).emit('exam_paused');
    // Notify all admins that status changed
    io.emit('status_change', { machineId, status: 'paused' });
    console.log(`⏸ Exam paused for ${machineId}`);
  });

  // ── Admin → Student: Resume ─────────────────────────────────────────────────
  socket.on('admin_resume', ({ machineId }) => {
    db.setStatus(machineId, 'active');
    io.to(`room_${machineId}`).emit('exam_resumed');
    io.emit('status_change', { machineId, status: 'active' });
    console.log(`▶️  Exam resumed for ${machineId}`);
  });

  // ── Admin → Student: Terminate ──────────────────────────────────────────────
  socket.on('admin_terminate', ({ machineId }) => {
    db.setStatus(machineId, 'terminated');
    const session = db.getSession(machineId);
    const finalScore = session ? session.current_score : 0;
    io.to(`room_${machineId}`).emit('exam_terminated', { finalScore });
    io.emit('status_change', { machineId, status: 'terminated', finalScore });
    console.log(`🔴 Exam terminated for ${machineId} | Final score: ${finalScore}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CheckMate server running on port ${PORT}`);
});
const express = require('express');
const router = express.Router();

let seats = []; // np. { id:1, day:1, seat:14, client:'Aga', email:'a@a.pl' }

// prosta sonda, żeby widzieć, że router się montuje
router.use((req, _res, next) => { console.log('[seats]', req.method, req.url); next(); });

// GET /api/seats
router.get('/seats', (_req, res) => res.json(seats));

// POST /api/seats
router.post('/seats', (req, res) => {
  const { day, seat, client, email } = req.body;
  if (!day || !seat || !client || !email) {
    return res.status(400).json({ message: 'day, seat, client, email are required' });
  }
  const taken = seats.some(s => Number(s.day) === Number(day) && Number(s.seat) === Number(seat));
  if (taken) return res.status(409).json({ message: 'The slot is already taken...' });

  const id = seats.length ? Math.max(...seats.map(s => s.id)) + 1 : 1;
  const created = { id, day: Number(day), seat: Number(seat), client, email };
  seats.push(created);
  return res.status(201).json(created);
});

module.exports = router;

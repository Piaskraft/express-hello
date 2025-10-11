const express = require('express');
const router = express.Router();

// Pseudo-baza w pamięci
let db = [
  { id: 1, author: 'John Doe',   text: 'This company is worth every coin!' },
  { id: 2, author: 'Amanda Doe', text: 'They really know how to make you happy.' },
];

// GET /api/testimonials
router.get('/testimonials', (req, res) => {
  res.json(db);
});

// GET /api/testimonials/random
router.get('/testimonials/random', (req, res) => {
  if (!db.length) return res.status(404).json({ message: 'Not found' });
  const item = db[Math.floor(Math.random() * db.length)];
  res.json(item);
});

// GET /api/testimonials/:id
router.get('/testimonials/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = db.find(t => t.id === id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

// POST /api/testimonials
router.post('/testimonials', (req, res) => {
  const { author, text } = req.body;
  if (!author || !text) return res.status(400).json({ message: 'author and text required' });

  const id = db.length ? Math.max(...db.map(t => t.id)) + 1 : 1;
  const created = { id, author, text };
  db.push(created);
  res.status(201).json(created);
});

// PUT /api/testimonials/:id
router.put('/testimonials/:id', (req, res) => {
  const id = Number(req.params.id);
  const { author, text } = req.body;

  const idx = db.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  if (!author || !text) return res.status(400).json({ message: 'author and text required' });

  db[idx] = { id, author, text };
  res.json(db[idx]);
});

// DELETE /api/testimonials/:id
router.delete('/testimonials/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = db.length;
  db = db.filter(t => t.id !== id);
  if (db.length === before) return res.status(404).json({ message: 'Not found' });
  res.status(204).send();
});

module.exports = router;

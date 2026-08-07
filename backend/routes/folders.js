const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get folders
router.get('/', async (req, res) => {
  try {
    const { parent_id } = req.query;
    let sql = 'SELECT * FROM folders WHERE user_id = ?';
    const params = [req.user.userId];
    
    if (parent_id === 'root' || !parent_id) {
      sql += ' AND parent_id IS NULL';
    } else {
      sql += ' AND parent_id = ?';
      params.push(parent_id);
    }
    
    const folders = await db.all(sql, params);
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create folder
router.post('/', async (req, res) => {
  try {
    let { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    if (parent_id === 'root') parent_id = null;

    const result = await db.run(
      'INSERT INTO folders (user_id, name, parent_id) VALUES (?, ?, ?)',
      [req.user.userId, name, parent_id || null]
    );

    const newFolder = await db.get('SELECT * FROM folders WHERE id = ?', [result.id]);
    res.status(201).json(newFolder);
  } catch (error) {
    res.status(500).json({ error: 'Create folder failed' });
  }
});

// Get starred folders
router.get('/filter/starred', async (req, res) => {
  try {
    const folders = await db.all('SELECT * FROM folders WHERE user_id = ? AND starred = 1', [req.user.userId]);
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search folders
router.get('/filter/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const folders = await db.all('SELECT * FROM folders WHERE user_id = ? AND name LIKE ?', [req.user.userId, `%${q}%`]);
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update folder
router.patch('/:id', async (req, res) => {
  try {
    const { name, parent_id, starred } = req.body;
    let sql = 'UPDATE folders SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (name !== undefined) { sql += ', name = ?'; params.push(name); }
    if (parent_id !== undefined) { sql += ', parent_id = ?'; params.push(parent_id === 'root' ? null : parent_id); }
    if (starred !== undefined) { sql += ', starred = ?'; params.push(starred ? 1 : 0); }

    sql += ' WHERE id = ? AND user_id = ?';
    params.push(req.params.id, req.user.userId);

    await db.run(sql, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete folder (cascade delete files inside physically and from DB)
router.delete('/:id', async (req, res) => {
  try {
    const fs = require('fs');
    const files = await db.all('SELECT storage_path FROM files WHERE folder_id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    files.forEach(f => {
      if (f.storage_path && fs.existsSync(f.storage_path)) {
        try { fs.unlinkSync(f.storage_path); } catch (e) {}
      }
    });

    await db.run('DELETE FROM files WHERE folder_id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    await db.run('DELETE FROM folders WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;

const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { upload } = require('../middleware/storage');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get all files (or files in a specific folder)
router.get('/', async (req, res) => {
  try {
    const { folder_id } = req.query;
    let sql = 'SELECT * FROM files WHERE user_id = ? AND deleted_at IS NULL';
    const params = [req.user.userId];
    
    if (folder_id === 'root' || !folder_id) {
      sql += ' AND folder_id IS NULL';
    } else {
      sql += ' AND folder_id = ?';
      params.push(folder_id);
    }
    
    const files = await db.all(sql, params);
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get starred files
router.get('/filter/starred', async (req, res) => {
  try {
    const files = await db.all('SELECT * FROM files WHERE user_id = ? AND starred = 1 AND deleted_at IS NULL', [req.user.userId]);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent files (last 30 days)
router.get('/filter/recent', async (req, res) => {
  try {
    const files = await db.all(
      "SELECT * FROM files WHERE user_id = ? AND deleted_at IS NULL AND updated_at >= datetime('now', '-30 days') ORDER BY updated_at DESC LIMIT 50",
      [req.user.userId]
    );
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trashed files
router.get('/filter/trash', async (req, res) => {
  try {
    const files = await db.all('SELECT * FROM files WHERE user_id = ? AND deleted_at IS NOT NULL', [req.user.userId]);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search files
router.get('/filter/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const files = await db.all('SELECT * FROM files WHERE user_id = ? AND deleted_at IS NULL AND name LIKE ?', [req.user.userId, `%${q}%`]);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let folder_id = req.body.folder_id;
    if (folder_id === 'root' || folder_id === 'null' || !folder_id) folder_id = null;

    // TODO: Check storage quota here
    
    const result = await db.run(
      'INSERT INTO files (user_id, folder_id, name, mime_type, size, storage_path) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, folder_id, req.file.originalname, req.file.mimetype, req.file.size, req.file.path]
    );

    const newFile = await db.get('SELECT * FROM files WHERE id = ?', [result.id]);
    res.status(201).json(newFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Download/View file
router.get('/:id/download', async (req, res) => {
  try {
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.deleted_at) return res.status(404).json({ error: 'File is in trash' });

    if (fs.existsSync(file.storage_path)) {
      res.download(file.storage_path, file.name);
    } else {
      res.status(404).json({ error: 'Physical file not found on disk' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Download failed' });
  }
});

router.get('/:id/view', async (req, res) => {
  try {
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (fs.existsSync(file.storage_path)) {
      res.sendFile(file.storage_path);
    } else {
      res.status(404).json({ error: 'Physical file not found on disk' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'View failed' });
  }
});

// Update file (rename, move, star)
router.patch('/:id', async (req, res) => {
  try {
    const { name, folder_id, starred } = req.body;
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    
    if (!file) return res.status(404).json({ error: 'File not found' });

    let sql = 'UPDATE files SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (name !== undefined) { sql += ', name = ?'; params.push(name); }
    if (folder_id !== undefined) { 
      sql += ', folder_id = ?'; 
      params.push(folder_id === 'root' ? null : folder_id); 
    }
    if (starred !== undefined) { sql += ', starred = ?'; params.push(starred ? 1 : 0); }

    sql += ' WHERE id = ?';
    params.push(req.params.id);

    if (params.length > 1) {
      await db.run(sql, params);
    }
    
    const updated = await db.get('SELECT * FROM files WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Restore file from trash
router.post('/:id/restore', async (req, res) => {
  try {
    await db.run('UPDATE files SET deleted_at = NULL WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: 'File restored' });
  } catch (error) {
    res.status(500).json({ error: 'Restore failed' });
  }
});

// Permanently delete file
router.delete('/:id/permanent', async (req, res) => {
  try {
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (file && file.storage_path && fs.existsSync(file.storage_path)) {
      try { fs.unlinkSync(file.storage_path); } catch (e) {}
    }
    await db.run('DELETE FROM files WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: 'File permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Permanent delete failed' });
  }
});

// Move to trash
router.delete('/:id', async (req, res) => {
  try {
    await db.run('UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: 'File moved to trash' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;

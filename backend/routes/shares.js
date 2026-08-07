const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Generate share link
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { item_type, item_id, allow_download } = req.body;
    if (!item_type || !item_id) return res.status(400).json({ error: 'Missing parameters' });

    // Verify ownership
    const table = item_type === 'file' ? 'files' : 'folders';
    const item = await db.get(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`, [item_id, req.user.userId]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Check if already shared
    const existing = await db.get('SELECT * FROM shares WHERE item_type = ? AND item_id = ?', [item_type, item_id]);
    if (existing) {
      return res.json(existing);
    }

    const token = crypto.randomBytes(8).toString('hex');
    const result = await db.run(
      'INSERT INTO shares (token, item_type, item_id, created_by, allow_download) VALUES (?, ?, ?, ?, ?)',
      [token, item_type, item_id, req.user.userId, allow_download === false ? 0 : 1]
    );

    const share = await db.get('SELECT * FROM shares WHERE id = ?', [result.id]);
    res.json(share);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Access share link (public)
router.get('/:token', async (req, res) => {
  try {
    const share = await db.get('SELECT * FROM shares WHERE token = ?', [req.params.token]);
    if (!share) return res.status(404).json({ error: 'Invalid or expired link' });

    if (share.item_type === 'file') {
      const file = await db.get('SELECT * FROM files WHERE id = ?', [share.item_id]);
      if (!file || file.deleted_at) return res.status(404).json({ error: 'File not found' });
      
      const fileData = {
        name: file.name,
        mime_type: file.mime_type,
        size: file.size,
        created_at: file.created_at,
        allow_download: share.allow_download
      };
      res.json({ type: 'file', file: fileData });
    } else {
      // For folders, we'd need to return contents
      res.status(501).json({ error: 'Folder sharing not fully implemented in this demo' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve share' });
  }
});

// Download shared file (public)
router.get('/:token/download', async (req, res) => {
  try {
    const share = await db.get('SELECT * FROM shares WHERE token = ?', [req.params.token]);
    if (!share) return res.status(404).json({ error: 'Invalid or expired link' });
    if (!share.allow_download) return res.status(403).json({ error: 'Downloads disabled for this link' });

    if (share.item_type === 'file') {
      const file = await db.get('SELECT * FROM files WHERE id = ?', [share.item_id]);
      if (!file || file.deleted_at) return res.status(404).json({ error: 'File not found' });

      if (fs.existsSync(file.storage_path)) {
        res.download(file.storage_path, file.name);
      } else {
        res.status(404).json({ error: 'Physical file not found on disk' });
      }
    } else {
      res.status(400).json({ error: 'Cannot download folder directly' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to download share' });
  }
});

module.exports = router;

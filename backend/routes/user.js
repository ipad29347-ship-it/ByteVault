const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/storage', async (req, res) => {
  try {
    // Calculate total usage
    const result = await db.get('SELECT SUM(size) as totalUsed FROM files WHERE user_id = ? AND deleted_at IS NULL', [req.user.userId]);
    const totalUsed = result.totalUsed || 0;
    
    // Calculate by categories
    const categories = await db.all(`
      SELECT 
        CASE 
          WHEN mime_type LIKE 'image/%' THEN 'images'
          WHEN mime_type LIKE 'video/%' THEN 'videos'
          WHEN mime_type LIKE 'audio/%' THEN 'audio'
          WHEN mime_type LIKE 'application/pdf' OR mime_type LIKE 'text/%' OR mime_type LIKE 'application/vnd.%' THEN 'documents'
          ELSE 'other'
        END as category,
        SUM(size) as size
      FROM files 
      WHERE user_id = ? AND deleted_at IS NULL
      GROUP BY category
    `, [req.user.userId]);

    const maxStorageGB = parseFloat(process.env.MAX_USER_STORAGE_GB || 5);
    const maxStorageBytes = maxStorageGB * 1024 * 1024 * 1024;

    res.json({
      used: totalUsed,
      total: maxStorageBytes,
      categories: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve storage info' });
  }
});

module.exports = router;

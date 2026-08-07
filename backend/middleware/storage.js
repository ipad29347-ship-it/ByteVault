const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// The storage path must be resolved absolutely to prevent any traversal outside it
// process.env.STORAGE_PATH is relative to the backend folder or absolute.
const STORAGE_ROOT = path.resolve(__dirname, '..', process.env.STORAGE_PATH || '../Storage');

// Ensure root storage directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!req.user || !req.user.userId) {
      return cb(new Error('Unauthorized to upload'));
    }
    
    // Create user-specific folder: Storage/users/<userId>/files
    const userDir = path.join(STORAGE_ROOT, 'users', String(req.user.userId), 'files');
    
    // Path traversal protection happens naturally here because path.join normalizes the path,
    // and we only use the authenticated req.user.userId.
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to prevent overwriting
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    // 5GB max file size for a single upload as a reasonable default
    fileSize: 5 * 1024 * 1024 * 1024
  }
});

module.exports = {
  upload,
  STORAGE_ROOT
};

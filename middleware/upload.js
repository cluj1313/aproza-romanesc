const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-');
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format de imagine nepermis. Folosește JPG, PNG, WEBP sau GIF.'));
  }
});

function single(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (err) {
        req.uploadError = err.message;
        return next();
      }
      next();
    });
  };
}

function fields(spec) {
  return (req, res, next) => {
    upload.fields(spec)(req, res, (err) => {
      if (err) {
        req.uploadError = err.message;
        return next();
      }
      next();
    });
  };
}

module.exports = { single, fields };

const multer = require("multer");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, per SRS-02.1
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or PDF files are allowed"));
    }
    cb(null, true);
  },
});

module.exports = upload;

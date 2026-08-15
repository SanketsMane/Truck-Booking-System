const UploadedFile = require("../models/uploadedFileModel");
const objectStorage = require("../utils/objectStorage");
const detectFileType = require("../utils/detectFileType");
const sendServerError = require("../utils/sendServerError");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file provided" });
    }

    // multer's fileFilter only checked the client-supplied (spoofable)
    // Content-Type header — verify the actual bytes match one of the
    // allowed types before this gets stored and later served back.
    const detectedType = detectFileType(req.file.buffer);
    if (!detectedType) {
      return res.status(400).json({ success: false, msg: "File content doesn't match a supported JPEG, PNG, or PDF" });
    }

    const storageKey = await objectStorage.saveFile(req.file.buffer, req.file.originalname);

    const file = await UploadedFile.create({
      owner: req.auth.id,
      storageKey,
      originalName: req.file.originalname,
      mimeType: detectedType,
      size: req.file.size,
      // Opt-in flag set by callers uploading a truck photo (a publicly
      // viewable asset), as opposed to the default private KYC document.
      isPublic: req.body.isPublic === "true" || req.body.isPublic === true,
    });

    res.status(201).json({ success: true, msg: "File uploaded", file: { id: file._id, url: `/files/${file._id}` } });
  } catch (error) {
    sendServerError(res, error, "fileController");
  }
};

// Public files (truck photos) are served to anyone, no auth required.
// Non-public files (KYC/RC/insurance/permit) keep the strict owner-or-admin
// check, which needs req.auth — so this route runs optionalAuthMiddleware
// rather than authMiddleware, and only rejects an unauthenticated caller
// once we know the file being requested isn't public (SRS-02.1).
const getFile = async (req, res) => {
  try {
    const file = await UploadedFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, msg: "File not found" });
    }

    if (!file.isPublic) {
      if (!req.auth) {
        return res.status(401).json({ success: false, msg: "Unauthorized" });
      }
      if (String(file.owner) !== req.auth.id && !req.auth.isAdmin) {
        return res.status(403).json({ success: false, msg: "Forbidden" });
      }
    }

    const buffer = await objectStorage.readFile(file.storageKey);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
    res.status(200).send(buffer);
  } catch (error) {
    sendServerError(res, error, "fileController");
  }
};

module.exports = { uploadFile, getFile };

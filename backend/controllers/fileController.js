const UploadedFile = require("../models/uploadedFileModel");
const objectStorage = require("../utils/objectStorage");
const detectFileType = require("../utils/detectFileType");
const sendServerError = require("../utils/sendServerError");
const { logAdminAction } = require("../utils/audit");

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
      const isOwner = String(file.owner) === req.auth.id;
      if (!isOwner && !req.auth.isAdmin) {
        return res.status(403).json({ success: false, msg: "Forbidden" });
      }
      // SRS §5.3 — "all admin document views logged". Only the admin-viewing-
      // someone-else's-document case counts; a user viewing their own file
      // isn't an access worth auditing.
      if (!isOwner && req.auth.isAdmin) {
        await logAdminAction({
          actor: req.auth.id,
          action: "file.view",
          targetType: "UploadedFile",
          targetId: file._id,
          reason: undefined,
          scope: req.auth.adminScope,
        });
      }
    }

    const buffer = await objectStorage.readFile(file.storageKey);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
    // A given /files/:id is immutable once created (replacing an asset like
    // the platform logo/favicon uploads a new file with a new id, see
    // adminController.updateBranding) — safe to cache public files
    // aggressively rather than decrypting from disk/S3 on every fetch,
    // which matters once one of these is loaded on every page view
    // site-wide (e.g. the navbar logo/favicon).
    if (file.isPublic) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    res.status(200).send(buffer);
  } catch (error) {
    sendServerError(res, error, "fileController");
  }
};

module.exports = { uploadFile, getFile };

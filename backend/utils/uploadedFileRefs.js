// Shared helpers for any document field that stores a plain `/files/:id`
// URL (not an ObjectId ref) pointing at an UploadedFile — the pattern
// platformSettingModel.js's logoUrl/faviconUrl and postModel.js's
// coverImageUrl both use. Extracted out of adminController.js (originally
// written only for branding) so postController.js can reuse the exact same
// reclaim/ensure-public logic instead of forking it.
const UploadedFile = require("../models/uploadedFileModel");
const objectStorage = require("../utils/objectStorage");

// A /files/:id URL's trailing segment is the UploadedFile's _id — used both
// to best-effort clean up a superseded file (old logo, old cover image) and
// to defensively mark a newly-referenced file public (an admin who forgot
// isPublic on upload shouldn't end up with a broken image).
const fileIdFromUrl = (url) => (url ? url.split("/").pop() : null);

const reclaimSupersededFile = async (oldUrl, newUrl) => {
  if (!oldUrl || oldUrl === newUrl) return;
  const oldId = fileIdFromUrl(oldUrl);
  if (!oldId) return;
  try {
    const oldFile = await UploadedFile.findById(oldId);
    if (!oldFile) return;
    await objectStorage.deleteFile(oldFile.storageKey);
    await UploadedFile.deleteOne({ _id: oldId });
  } catch (error) {
    console.error("[uploadedFileRefs] failed to reclaim superseded file:", error.message);
  }
};

const ensurePublic = async (url) => {
  const id = fileIdFromUrl(url);
  if (!id) return;
  try {
    await UploadedFile.updateOne({ _id: id, isPublic: false }, { $set: { isPublic: true } });
  } catch {
    // Not fatal — worst case the admin re-saves after fixing isPublic on
    // the original upload, or the id doesn't resolve to a real file at all
    // (a hand-crafted request), which the 404 on GET /files/:id will surface.
  }
};

module.exports = { fileIdFromUrl, reclaimSupersededFile, ensurePublic };

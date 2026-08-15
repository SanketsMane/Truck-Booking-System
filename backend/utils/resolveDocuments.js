const UploadedFile = require("../models/uploadedFileModel");

// Shared by Verification, Truck document submission, and Truck photo
// submission — turns [{docType, fileId}] (or, for photos, [{fileId}] with
// no docType) into the {docType, url, uploadedAt} shape the models store,
// after confirming every fileId was actually uploaded by this user. Photo
// subdocuments don't define a docType field, so the resulting undefined
// docType is silently dropped by Mongoose's strict-mode assignment.
const resolveDocuments = async (documents, ownerId) => {
  const fileIds = documents.map((d) => d.fileId);
  const files = await UploadedFile.find({ _id: { $in: fileIds }, owner: ownerId });
  if (files.length !== fileIds.length) {
    throw new Error("One or more files were not found or aren't yours");
  }

  const urlByFileId = new Map(files.map((f) => [String(f._id), `/files/${f._id}`]));
  return documents.map((d) => ({
    docType: d.docType,
    url: urlByFileId.get(d.fileId),
    uploadedAt: new Date(),
  }));
};

module.exports = resolveDocuments;

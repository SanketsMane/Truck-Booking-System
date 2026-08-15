import { api, fetchBlobUrl } from "./client";

// Returns { file: { id, url } }. Pass { isPublic: true } for assets that
// should be viewable by anyone without auth (e.g. truck photos) — omit it
// (or pass false) for private KYC/RC/insurance/permit documents, which is
// the default on the backend.
export const uploadFile = (file, { isPublic } = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (isPublic) formData.append("isPublic", "true");
  return api.upload("/files", formData);
};

// url is the "/files/:id" path returned alongside a document reference.
export const getFileBlobUrl = (url) => fetchBlobUrl(url);

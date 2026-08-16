import { api, fetchBlobUrl, fetchBlob } from "./client";

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

// Same as getFileBlobUrl, but resolves { url, type } — for an inline
// previewer that needs to know the MIME type to render it (image vs PDF)
// instead of just handing it off to a new tab.
export const getFileBlob = (url) => fetchBlob(url);

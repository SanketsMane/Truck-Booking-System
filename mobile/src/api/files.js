import { api, fetchFile } from "./client";

// RN's FormData takes a { uri, name, type } descriptor for a picked file
// (from expo-image-picker/expo-document-picker), not a browser File object —
// this is the one real shape difference from frontend/src/api/files.js's
// uploadFile. Same backend contract otherwise: POST /files, isPublic:true
// for a public asset (truck photos), omitted/false for private KYC docs.
export const uploadFile = ({ uri, name, type }, { isPublic } = {}) => {
  const formData = new FormData();
  formData.append("file", { uri, name: name || "upload.jpg", type: type || "image/jpeg" });
  if (isPublic) formData.append("isPublic", "true");
  return api.upload("/files", formData);
};

// Returns the raw Response for a private/owner-gated file — the caller
// reads it however the specific viewer needs (blob() for an in-app image
// preview via URL.createObjectURL where supported, or hands the Response
// off to a document viewer).
export const getFile = (url) => fetchFile(url);

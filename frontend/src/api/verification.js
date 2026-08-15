import { api } from "./client";

// type: "shipper" | "transporter"; documents: [{ docType, fileId }]; businessName optional
export const submitVerification = ({ type, businessName, documents }) =>
  api.post("/verification", { type, businessName, documents });

export const getMyVerifications = () => api.get("/verification/me");

export const listVerificationQueue = ({ type, status = "pending" } = {}) => {
  const params = new URLSearchParams({ status, ...(type ? { type } : {}) });
  return api.get(`/verification/queue?${params}`);
};

export const reviewVerification = (id, { status, reason }) =>
  api.put(`/verification/${id}/review`, { status, reason });

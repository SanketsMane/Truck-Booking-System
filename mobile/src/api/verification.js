import { api } from "./client";

// type: "shipper" | "transporter"; documents: [{ docType, fileId }]; businessName optional.
// Driver ("transporter") verification requires an ID proof (aadhaar/pan)
// AND a driving_license doc AND a profile photo already on the account —
// see verificationController.submitVerification's role-scoped check.
export const submitVerification = ({ type, businessName, documents }) =>
  api.post("/verification", { type, businessName, documents });

export const getMyVerifications = () => api.get("/verification/me");

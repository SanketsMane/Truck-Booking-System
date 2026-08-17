import { ShieldCheck, ShieldAlert } from "lucide-react";
import { StatusBadge } from "./Badge";

// The verification gate (PlatformSetting.verificationGateEnabled) no longer
// blocks posting a trip or accepting a booking — an unverified transporter
// or shipper can still transact. This badge is what replaces that block:
// it shows the real status next to a counterparty's name/avatar so the
// other party can decide for themselves whether to proceed, instead of the
// system deciding for them.
export const VerifiedBadge = ({ verified }) => (
  <StatusBadge status={verified ? "verified" : "pending"}>
    {verified ? (
      <ShieldCheck size={12} strokeWidth={2.4} style={{ marginRight: 4, verticalAlign: -2 }} />
    ) : (
      <ShieldAlert size={12} strokeWidth={2.4} style={{ marginRight: 4, verticalAlign: -2 }} />
    )}
    {verified ? "Verified" : "Not verified"}
  </StatusBadge>
);

export default VerifiedBadge;

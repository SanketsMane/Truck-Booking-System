// Matches backend/models/userModel.js's adminScope enum exactly — a scope
// listed here that isn't a valid enum value fails setAdminRole's Joi
// validation with a 400 the moment someone picks it. Shared between
// UserDetail.jsx's "Admin access" card and Users.jsx's "Make admin" action
// so the two can't drift out of sync with each other.
export const ADMIN_SCOPES = [
  { value: "", label: "None — not an admin" },
  { value: "full", label: "Full admin (superuser)" },
  { value: "verification", label: "Verification" },
  { value: "support", label: "Support" },
  { value: "content", label: "Content (blog, news, updates)" },
];

export default ADMIN_SCOPES;

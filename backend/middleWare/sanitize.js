// Strips NoSQL-operator-shaped keys ($gt, $where, "a.b", …) out of any
// user-controlled input before it reaches a Mongoose query — defense in
// depth against the classic "pass an object where a string is expected"
// NoSQL injection (e.g. { email: { $ne: null } }). Regex-search inputs are
// already escaped at the query-building call sites; this covers every
// other field, including ones added later without that escaping in mind.
//
// Mutates req.body/req.params/req.query IN PLACE rather than reassigning
// them — Express 5 makes req.query a getter-only property, so
// `req.query = sanitized` throws. Walking the existing object and
// deleting/rewriting its keys works on every Express version.
const sanitizeInPlace = (value) => {
  if (Array.isArray(value)) {
    value.forEach(sanitizeInPlace);
    return value;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
        continue;
      }
      sanitizeInPlace(value[key]);
    }
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.params);
  sanitizeInPlace(req.query);
  next();
};

module.exports = sanitizeInput;

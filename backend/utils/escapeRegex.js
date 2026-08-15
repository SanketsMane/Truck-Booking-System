// Escapes a string for safe use inside a RegExp — needed anywhere user
// input (city names, etc.) is matched case-insensitively via $regex.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;

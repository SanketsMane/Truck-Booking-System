// Turns a post title into a URL-safe slug — "Best Truck Routes in
// Maharashtra (2026)!" -> "best-truck-routes-in-maharashtra-2026". Wired
// into postModel.js's `slug` field as a Mongoose `set:` transform, the same
// normalize-on-write pattern regNumber.js uses for truck plates — this only
// normalizes whatever string it's given; postController resolves actual
// uniqueness (a setter can't query the DB), see ensureUniqueSlug there.
//
// Idempotent — slugify(slugify(x)) === slugify(x) — which is what makes it
// safe to run on a value that's already a slug (e.g. an admin-submitted
// custom slug gets normalized the same way a title-derived one does).
const MAX_LENGTH = 80;

// Combining diacritical marks (U+0300-U+036F) that NFKD splits an accented
// letter into, e.g. "e" + U+0301 (acute accent) for "e". Stripping this
// range after normalize("NFKD") turns "Café" into "Cafe" instead of
// dropping the character (and its slug slot) entirely.
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

const slugify = (value) => {
  if (typeof value !== "string") return "";
  const base = value
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (base.length <= MAX_LENGTH) return base;
  // Truncate on a word boundary rather than mid-word — cutting at exactly
  // MAX_LENGTH could split "maharashtra" into "mahar" mid-token.
  const truncated = base.slice(0, MAX_LENGTH);
  const lastDash = truncated.lastIndexOf("-");
  return (lastDash > 0 ? truncated.slice(0, lastDash) : truncated).replace(/-+$/, "");
};

// Matches only what slugify() can produce — lowercase alphanumerics
// separated by single hyphens, no leading/trailing hyphen.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

module.exports = { slugify, SLUG_PATTERN };

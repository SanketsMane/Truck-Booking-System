const mongoose = require("mongoose");
const { slugify } = require("../utils/slugify");

// Normalizes a tag the same way slugify does (lowercase, hyphenated), then
// dedupes and caps at 8 — an admin typing "SEO, seo, Trucking" shouldn't
// produce 3 separate tags for what's really one topic. Applied per-element
// via a Mongoose array setter.
const MAX_TAGS = 8;
const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const normalized = [];
  for (const raw of tags) {
    const tag = slugify(String(raw ?? ""));
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= MAX_TAGS) break;
  }
  return normalized;
};

// Blog / News / Update all share this exact shape — only the listing
// route, page copy, and schema.org @type (see frontend/src/components/
// PostSchema.jsx) differ per type, so one model with a `type` enum instead
// of three parallel models. Slugs are unique ACROSS all three types (not
// scoped per type), so /blog/:slug, /news/:slug, /updates/:slug are each an
// unambiguous single-field lookup and changing a post's type later never
// breaks its URL.
const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["blog", "news", "update"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    // The setter only NORMALIZES (lowercase/hyphenate) — it can't resolve
    // uniqueness itself (a Mongoose setter is synchronous, can't query the
    // DB). backend/controllers/postController.js's ensureUniqueSlug does
    // the actual base/base-2/base-3... collision check before every write;
    // this unique index is the real backstop against the create/create
    // race that check-then-write can't fully close on its own.
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      set: slugify,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    // Card summary, meta-description fallback (when seoDescription is
    // empty), and the RSS <description>.
    excerpt: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    // Sanitized HTML — backend/utils/sanitizeContent.js's sanitizeBody()
    // runs on every write in postController; nothing else ever assigns
    // this field.
    body: {
      type: String,
      required: true,
    },

    // Plain-text projection of `body`, derived server-side alongside it on
    // every write (never client-writable — see postValidation.js's
    // Joi.forbidden()). Powers regex search over title/excerpt/bodyText
    // instead of over raw HTML, readingMinutes, and the JSON-LD
    // articleBody field — body itself is never embedded in JSON-LD.
    bodyText: {
      type: String,
      default: "",
    },

    // A plain /files/:id URL string, matching platformSettingModel.js's
    // logoUrl/faviconUrl convention — not an ObjectId ref to UploadedFile.
    coverImageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    coverImageAlt: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
      set: normalizeTags,
    },

    // Set from req.auth.id server-side in postController — never trusted
    // from the request body.
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional public byline override ("Truckgee Editorial") so the
    // JSON-LD/page byline doesn't have to show a staff member's real
    // account name — falls back to the populated author.name when empty.
    authorName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    // Distinct from createdAt (when the draft was started). Set once, on
    // the FIRST publish only (postController.publishPost) — an unpublish
    // then republish cycle (e.g. fixing a typo) never resets this, so the
    // post doesn't look brand-new to Google every time it's touched.
    publishedAt: {
      type: Date,
      default: null,
    },

    // <title>/meta-description overrides — empty falls back to
    // title/excerpt respectively.
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 70,
      default: "",
    },

    seoDescription: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },

    // Lets an admin publish a page that's reachable but excluded from
    // sitemap-content.xml and rss.xml — an escape hatch for thin/low-value
    // content without needing a whole separate visibility mechanism.
    noIndex: {
      type: Boolean,
      default: false,
    },

    // Derived from bodyText word count / 200 wpm (utils/sanitizeContent.js's
    // readingMinutes(), which itself never returns less than 1) — rendered
    // as "4 min read" on the public post page. Defaults to 1, not 0: the
    // controller always overwrites this with a real value before every
    // save, so a doc should never actually persist at its default, but a
    // default of 0 would fail this field's own `min` on the rare path
    // where it briefly does (e.g. a `new Post()` validated before the
    // controller finishes populating it).
    readingMinutes: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

// Public list: the hot path (status+type filter, newest-published-first).
postSchema.index({ status: 1, type: 1, publishedAt: -1 });
// Admin list, drafts included.
postSchema.index({ type: 1, createdAt: -1 });
// Tag filter now; tag archive pages are a later addition, this index
// already covers them.
postSchema.index({ tags: 1, status: 1 });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;

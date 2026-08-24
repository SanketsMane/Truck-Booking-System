const Joi = require("joi");
const { slugify } = require("../utils/slugify");

// Normalizes a submitted slug the same way postController.createPost/
// updatePost would anyway (via slugify()) — so a human typing "My Custom
// Slug!!!" into the admin editor's "Edit URL" field gets it turned into
// "my-custom-slug" instead of a validation error, matching
// truckValidation.js's regNumberSchema (normalize-then-pattern-check-the-
// RESULT, not the raw input). An empty string is allowed through as-is —
// that's "no override, derive from the title" — but non-empty input that
// slugifies down to nothing (e.g. "!!!") is a real mistake worth a clear
// error rather than silently falling back.
const slugSchema = Joi.string()
  .trim()
  .max(90)
  .allow("")
  .custom((value, helpers) => {
    if (value === "") return value;
    const normalized = slugify(value);
    if (!normalized) return helpers.error("slug.empty");
    return normalized;
  })
  .messages({
    "slug.empty": "That URL doesn't contain any usable characters — try a different one",
  });

// .required() on the object itself (not just its fields) — express.json()
// leaves req.body as undefined, not {}, on a request with no body, and Joi
// only rejects that if the schema says the value itself is required (see
// adminValidation.js's identical comment).
//
// status/publishedAt/author/bodyText/readingMinutes are ALL Joi.forbidden()
// on both create and update — every server-controlled field is explicitly
// rejected if a client tries to set it directly. This is also what proves
// publish state can't be smuggled past the dedicated publish/unpublish/
// archive endpoints (postController.js) via a plain PUT.
const createPostValidation = Joi.object({
  type: Joi.string().valid("blog", "news", "update").required(),
  title: Joi.string().trim().min(3).max(160).required(),
  slug: slugSchema,
  excerpt: Joi.string().trim().max(300).allow(""),
  body: Joi.string().min(1).required(),
  coverImageUrl: Joi.string().trim().allow("", null),
  coverImageAlt: Joi.string().trim().max(160).allow(""),
  tags: Joi.array().items(Joi.string().trim()).max(8).default([]),
  authorName: Joi.string().trim().max(80).allow(""),
  seoTitle: Joi.string().trim().max(70).allow(""),
  seoDescription: Joi.string().trim().max(180).allow(""),
  noIndex: Joi.boolean().default(false),

  status: Joi.forbidden(),
  publishedAt: Joi.forbidden(),
  author: Joi.forbidden(),
  bodyText: Joi.forbidden(),
  readingMinutes: Joi.forbidden(),
}).required();

// Same shape, every field optional, but .min(1) on the object so an
// empty-body PUT 400s instead of silently no-op-200ing.
const updatePostValidation = Joi.object({
  type: Joi.string().valid("blog", "news", "update"),
  title: Joi.string().trim().min(3).max(160),
  slug: slugSchema,
  excerpt: Joi.string().trim().max(300).allow(""),
  body: Joi.string().min(1),
  coverImageUrl: Joi.string().trim().allow("", null),
  coverImageAlt: Joi.string().trim().max(160).allow(""),
  tags: Joi.array().items(Joi.string().trim()).max(8),
  authorName: Joi.string().trim().max(80).allow(""),
  seoTitle: Joi.string().trim().max(70).allow(""),
  seoDescription: Joi.string().trim().max(180).allow(""),
  noIndex: Joi.boolean(),

  status: Joi.forbidden(),
  publishedAt: Joi.forbidden(),
  author: Joi.forbidden(),
  bodyText: Joi.forbidden(),
  readingMinutes: Joi.forbidden(),
})
  .min(1)
  .required();

// Keeps a garbage `type=<script>` or an unbounded `limit` out of the query
// builder entirely, same role getPagination/paginatedResponse play for the
// page/limit half of this on every other admin list endpoint.
const listPostsQueryValidation = Joi.object({
  type: Joi.string().valid("blog", "news", "update"),
  tag: Joi.string().trim().max(80),
  search: Joi.string().trim().max(160).allow(""),
  status: Joi.string().valid("draft", "published", "archived"),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

module.exports = { createPostValidation, updatePostValidation, listPostsQueryValidation };

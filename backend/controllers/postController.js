const Post = require("../models/postModel");
const { createPostValidation, updatePostValidation, listPostsQueryValidation } = require("../validators/postValidation");
const { slugify } = require("../utils/slugify");
const { sanitizeBody, htmlToText, readingMinutes: computeReadingMinutes } = require("../utils/sanitizeContent");
const { reclaimSupersededFile, ensurePublic } = require("../utils/uploadedFileRefs");
const { logAdminAction } = require("../utils/audit");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const escapeRegex = require("../utils/escapeRegex");
const xmlEscape = require("../utils/xmlEscape");
const { getBrandName } = require("../utils/brandingCache");
const sendServerError = require("../utils/sendServerError");

const FRONTEND_URL = () => process.env.FRONTEND_URL || "http://localhost:5173";

// The only place the type->URL-prefix translation lives on the backend
// (mirrors frontend/src/content/postTypes.js, which owns the same mapping
// for the SPA's own routing) — used to build absolute post URLs for the
// sitemap and RSS feed. "update" (singular, matching the schema enum) maps
// to the plural "/updates" path.
const BASE_PATH_BY_TYPE = { blog: "/blog", news: "/news", update: "/updates" };

const postUrl = (post) => `${FRONTEND_URL()}${BASE_PATH_BY_TYPE[post.type]}/${post.slug}`;

// A pure normalization setter can't query the DB, so uniqueness across all
// three types (a shared slug namespace — see postModel.js) is resolved
// here: try the base slug, then base-2, base-3, ... until one doesn't
// collide with any OTHER post (excludeId lets an update keep its own
// slug). The unique index on Post.slug is still the real backstop against
// a create/create race this check-then-write can't fully close.
const ensureUniqueSlug = async (baseSlug, excludeId) => {
  let candidate = baseSlug;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filter = excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate };
    // eslint-disable-next-line no-await-in-loop
    const collision = await Post.exists(filter);
    if (!collision) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

// Shared by createPost/updatePost — sanitizes body server-side (the only
// two write paths for Post.body) and derives bodyText/readingMinutes
// alongside it. Never called with anything the caller hasn't already
// decided should overwrite the stored body.
const processBody = (rawBody) => {
  const body = sanitizeBody(rawBody);
  const bodyText = htmlToText(body);
  return { body, bodyText, readingMinutes: computeReadingMinutes(bodyText) };
};

// Audit before/after payloads deliberately exclude body/bodyText — an
// AuditLog document carrying full article HTML on every edit would balloon
// that collection. `bodyChanged` records THAT the body changed without
// logging what it changed to/from.
const auditSnapshot = (post) => ({
  title: post.title,
  slug: post.slug,
  type: post.type,
  status: post.status,
  publishedAt: post.publishedAt,
});

// ===== Admin =====

const listAdminPosts = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.title = re;
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .select("-body -bodyText")
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(posts, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

const getAdminPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "name");
    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

const createPost = async (req, res) => {
  try {
    const { error, value } = createPostValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { body, bodyText, readingMinutes } = processBody(value.body);
    if (!bodyText) {
      return res.status(400).json({ success: false, msg: "Post body is empty after formatting was removed" });
    }

    const baseSlug = slugify(value.slug || value.title);
    const slug = await ensureUniqueSlug(baseSlug);

    if (value.coverImageUrl) await ensurePublic(value.coverImageUrl);

    let created;
    try {
      created = await Post.create({
        type: value.type,
        title: value.title,
        slug,
        excerpt: value.excerpt || "",
        body,
        bodyText,
        readingMinutes,
        coverImageUrl: value.coverImageUrl || "",
        coverImageAlt: value.coverImageAlt || "",
        tags: value.tags || [],
        author: req.auth.id,
        authorName: value.authorName || "",
        seoTitle: value.seoTitle || "",
        seoDescription: value.seoDescription || "",
        noIndex: Boolean(value.noIndex),
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json({ success: false, msg: "A post with this URL already exists" });
      }
      throw createError;
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "post.create",
      targetType: "Post",
      targetId: created._id,
      before: null,
      after: auditSnapshot(created),
      scope: req.auth.adminScope,
    });

    const post = await Post.findById(created._id).populate("author", "name");
    res.status(201).json({ success: true, msg: "Post created", post });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }

    const { error, value } = updatePostValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const before = auditSnapshot(post);
    let bodyChanged = false;

    if (value.type !== undefined) post.type = value.type;
    if (value.title !== undefined) post.title = value.title;
    // Title edits deliberately do NOT change an already-set slug — silently
    // rotating a published URL is an SEO regression. The slug only moves
    // when the request explicitly includes one (the admin editor's own
    // "Edit URL" affordance), normalized + uniquified same as on create.
    if (value.slug !== undefined && value.slug !== "") {
      const baseSlug = slugify(value.slug);
      if (baseSlug !== post.slug) {
        post.slug = await ensureUniqueSlug(baseSlug, post._id);
      }
    }
    if (value.excerpt !== undefined) post.excerpt = value.excerpt;
    if (value.body !== undefined) {
      const { body, bodyText, readingMinutes } = processBody(value.body);
      if (!bodyText) {
        return res.status(400).json({ success: false, msg: "Post body is empty after formatting was removed" });
      }
      post.body = body;
      post.bodyText = bodyText;
      post.readingMinutes = readingMinutes;
      bodyChanged = true;
    }
    if (value.coverImageUrl !== undefined) {
      await reclaimSupersededFile(post.coverImageUrl, value.coverImageUrl);
      if (value.coverImageUrl) await ensurePublic(value.coverImageUrl);
      post.coverImageUrl = value.coverImageUrl || "";
    }
    if (value.coverImageAlt !== undefined) post.coverImageAlt = value.coverImageAlt;
    if (value.tags !== undefined) post.tags = value.tags;
    if (value.authorName !== undefined) post.authorName = value.authorName;
    if (value.seoTitle !== undefined) post.seoTitle = value.seoTitle;
    if (value.seoDescription !== undefined) post.seoDescription = value.seoDescription;
    if (value.noIndex !== undefined) post.noIndex = value.noIndex;

    try {
      await post.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        return res.status(409).json({ success: false, msg: "A post with this URL already exists" });
      }
      throw saveError;
    }

    await logAdminAction({
      actor: req.auth.id,
      action: "post.update",
      targetType: "Post",
      targetId: post._id,
      before,
      after: { ...auditSnapshot(post), bodyChanged },
      scope: req.auth.adminScope,
    });

    const updated = await Post.findById(post._id).populate("author", "name");
    res.status(200).json({ success: true, msg: "Post updated", post: updated });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

// The one endpoint with real publish-time logic — matches this codebase's
// "state transition = its own endpoint" convention (bookingController's
// acceptBooking/rejectBooking, adminController's deactivateTrip) rather
// than a generic `status` field on the plain PUT above, which
// createPostValidation/updatePostValidation both forbid outright.
const publishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }
    if (post.status === "archived") {
      return res.status(400).json({ success: false, msg: "Un-archive this post before publishing it" });
    }
    if (!post.excerpt.trim()) {
      return res.status(400).json({ success: false, msg: "Add an excerpt before publishing — it's used as the page's meta description" });
    }

    const before = auditSnapshot(post);
    post.status = "published";
    // Set only on the FIRST publish — an unpublish -> republish cycle (e.g.
    // fixing a typo) must not reset this, or the post looks brand-new to
    // Google every time it's touched.
    if (!post.publishedAt) post.publishedAt = new Date();
    await post.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "post.publish",
      targetType: "Post",
      targetId: post._id,
      before,
      after: auditSnapshot(post),
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Post published", post });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

const unpublishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }

    const before = auditSnapshot(post);
    post.status = "draft"; // publishedAt intentionally untouched
    await post.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "post.unpublish",
      targetType: "Post",
      targetId: post._id,
      before,
      after: auditSnapshot(post),
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Post unpublished", post });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

const archivePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }

    const before = auditSnapshot(post);
    post.status = "archived";
    await post.save();

    await logAdminAction({
      actor: req.auth.id,
      action: "post.archive",
      targetType: "Post",
      targetId: post._id,
      before,
      after: auditSnapshot(post),
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Post archived", post });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

// Hard delete — gated "full"-only at the route level (adminRoutes.js),
// matching deleteUser. A "content"-scoped admin can archive but not
// permanently destroy.
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }

    if (post.coverImageUrl) await reclaimSupersededFile(post.coverImageUrl, null);
    await Post.deleteOne({ _id: post._id });

    await logAdminAction({
      actor: req.auth.id,
      action: "post.delete",
      targetType: "Post",
      targetId: post._id,
      before: auditSnapshot(post),
      after: null,
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Post deleted" });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

// ===== Public =====

const listPublicPosts = async (req, res) => {
  try {
    const { error, value } = listPostsQueryValidation.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = { status: "published", publishedAt: { $lte: new Date() } };
    if (value.type) filter.type = value.type;
    if (value.tag) filter.tags = slugify(value.tag);
    if (value.search) {
      const re = new RegExp(escapeRegex(value.search), "i");
      filter.$or = [{ title: re }, { excerpt: re }];
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .select("-body -bodyText")
        .populate("author", "name")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(posts, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

// 404 (not 403) for a draft/archived slug — a draft's existence shouldn't
// be discoverable by probing URLs.
const getPublicPost = async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      status: "published",
      publishedAt: { $lte: new Date() },
    }).populate("author", "name");

    if (!post) {
      return res.status(404).json({ success: false, msg: "Post not found" });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

// ===== SEO delivery =====

const getContentSitemap = async (req, res) => {
  try {
    const posts = await Post.find({ status: "published", noIndex: false, publishedAt: { $lte: new Date() } })
      .select("slug type updatedAt publishedAt")
      .sort({ publishedAt: -1 })
      .limit(45000) // sitemap spec caps at 50,000 URLs per file
      .lean();

    const listPages = Object.values(BASE_PATH_BY_TYPE).map(
      (basePath) => `  <url>
    <loc>${xmlEscape(FRONTEND_URL() + basePath)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    );

    const postUrls = posts.map((post) => {
      const lastmod = (post.updatedAt || post.publishedAt).toISOString().slice(0, 10);
      return `  <url>
    <loc>${xmlEscape(postUrl(post))}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...listPages, ...postUrls].join("\n")}
</urlset>
`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.status(200).send(xml);
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

// Breaks up a literal "]]>" inside CDATA — the sanitizer's allowlist makes
// this essentially unreachable in practice, but it's one line of insurance
// against a malformed feed.
const escapeCdata = (value) => String(value ?? "").replace(/]]>/g, "]]&gt;");

const getRssFeed = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { status: "published", noIndex: false, publishedAt: { $lte: new Date() } };
    if (type && BASE_PATH_BY_TYPE[type]) filter.type = type;

    const posts = await Post.find(filter).sort({ publishedAt: -1 }).limit(20);

    const brandName = getBrandName();
    const channelLink = FRONTEND_URL();
    const lastBuildDate = (posts[0]?.publishedAt || new Date()).toUTCString();

    const items = posts
      .map((post) => {
        const url = postUrl(post);
        return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${post.publishedAt.toUTCString()}</pubDate>
      <description>${xmlEscape(post.excerpt)}</description>
      <content:encoded><![CDATA[${escapeCdata(post.body)}]]></content:encoded>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(brandName)}</title>
    <link>${xmlEscape(channelLink)}</link>
    <description>${xmlEscape(`${brandName} — blog, news and product updates`)}</description>
    <language>en-in</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${xmlEscape(channelLink + "/rss.xml")}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=1800");
    res.status(200).send(xml);
  } catch (error) {
    sendServerError(res, error, "postController");
  }
};

module.exports = {
  listAdminPosts,
  getAdminPost,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  archivePost,
  deletePost,
  listPublicPosts,
  getPublicPost,
  getContentSitemap,
  getRssFeed,
};

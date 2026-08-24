// The server-side sanitization boundary for admin-authored post bodies
// (backend/controllers/postController.js's createPost/updatePost — the
// only two write paths for Post.body). This is the actual security
// boundary, not the TipTap editor in the admin UI: a hand-crafted request
// straight to POST /admin/posts must come out exactly as clean as one that
// went through the editor. There is deliberately no second, client-side
// sanitizer (e.g. DOMPurify) — one sanitizer with one configuration avoids
// the two silently drifting apart and someone later assuming the client
// one is the real boundary.
//
// package.json pins sanitize-html to exactly 2.17.5 (not a ^2.x range) —
// 2.17.6+ bumps its htmlparser2 dependency to a version that ships ESM-only
// (no CommonJS build at all), which this CJS Jest setup can't require() and
// every test in this file/repo would start failing on. 2.17.5 is also the
// oldest version with the incomplete-URI-scheme-validation fix (GHSA-vccv-
// cmxp-4j9h) applied — 2.17.4 and earlier are vulnerable via action/
// formaction/data/poster/background attributes, none of which this file's
// ALLOWED_ATTRIBUTES permits anyway, but there's no reason to rely on that
// alone when a patched, Jest-compatible version exists. Before bumping this
// dependency, re-check htmlparser2's package.json for `"type": "module"`
// with no working `main`/exports "require" condition.
const sanitizeHtml = require("sanitize-html");

// Strict allowlist (positive, not a denylist) — every tag/attribute a
// legitimate blog/news/update post body needs, and nothing else. No
// class/style/id/data-* on anything: that alone kills the entire
// on*="..." event-handler XSS class and stops an author from injecting
// layout-breaking inline CSS.
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s",
  "h2", "h3", "h4",
  "ul", "ol", "li",
  "blockquote", "a", "img", "figure", "figcaption",
  "code", "pre", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTRIBUTES = {
  // rel/target are attacker-uninteresting on their own (no script
  // execution surface) and are what transformTags below sets on external
  // links — without them here, allowedAttributes would filter the
  // transform's own output back out.
  a: ["href", "title", "rel", "target"],
  img: ["src", "alt", "title", "width", "height"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];

const sanitizeOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ALLOWED_SCHEMES,
  allowProtocolRelative: false,
  // "discard" unwraps a disallowed-but-benign tag (e.g. a stray <h1> pasted
  // from Word) down to its plain text content, folded into the surrounding
  // flow — the author's words survive, just not wrapped in that tag. That's
  // NOT the behavior for genuinely dangerous tags: nonTextTags below makes
  // sanitize-html treat script/style/etc.'s content as non-text, so
  // <script>alert(1)</script> is removed tag-and-contents, never degrading
  // into a bare text node reading "alert(1)".
  disallowedTagsMode: "discard",
  nonTextTags: ["script", "style", "textarea", "noscript", "iframe"],
  // Only an EXTERNAL (absolute-URL) link gets nofollow/noopener/noreferrer
  // + target=_blank forced on — an admin shouldn't be able to leak site
  // authority to an arbitrary external site by accident, and noopener
  // closes the classic window.opener reverse-tabnabbing gap. A relative
  // link to another post/page on this site is deliberately left alone:
  // forcing nofollow on it would block internal link-equity flow (the
  // opposite of what an SEO-focused content feature wants), and forcing a
  // new tab on same-site navigation is bad UX.
  transformTags: {
    a: (tagName, attribs) => {
      const isExternal = /^https?:\/\//i.test(attribs.href || "");
      if (!isExternal) return { tagName, attribs };
      return { tagName, attribs: { ...attribs, rel: "nofollow noopener noreferrer", target: "_blank" } };
    },
  },
  exclusiveFilter: (frame) => {
    // img src is restricted to same-origin /files/... paths or a real
    // https:// URL — allowedSchemes already blocks javascript:/data:, this
    // additionally rejects an http:// (unencrypted) image source and any
    // other absolute-but-not-file-upload path.
    if (frame.tag === "img") {
      const src = frame.attribs.src || "";
      const isOwnUpload = src.startsWith("/files/");
      const isHttps = /^https:\/\//i.test(src);
      return !isOwnUpload && !isHttps;
    }
    return false;
  },
};

const sanitizeBody = (html) => sanitizeHtml(String(html ?? ""), sanitizeOptions);

// Plain-text projection of sanitized body HTML — powers admin/public
// search (regex over bodyText, not the HTML), readingMinutes, and the
// JSON-LD articleBody field. Deliberately never fed raw, unsanitized HTML
// (always called on the already-sanitized body in postController).
const htmlToText = (html) =>
  sanitizeHtml(String(html ?? ""), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const readingMinutes = (text) => {
  const wordCount = String(text ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
};

module.exports = { sanitizeBody, htmlToText, readingMinutes };

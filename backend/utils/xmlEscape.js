// Escapes the five XML-significant characters for interpolating a plain
// string (a post title, an excerpt) into hand-built XML — the sitemap and
// RSS feed (backend/controllers/postController.js's getContentSitemap/
// getRssFeed) are template strings, not built through an XML/DOM library,
// so nothing else does this automatically. An unescaped "&" in a title
// alone is enough to produce invalid XML that Search Console rejects
// outright with no useful error message.
const xmlEscape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[ch]));

module.exports = xmlEscape;

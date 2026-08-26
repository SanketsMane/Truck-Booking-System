// Post bodies are server-sanitized HTML (backend/models/postModel.js),
// admin-authored, never markdown — the web app renders it directly via
// dangerouslySetInnerHTML. This app has no HTML renderer, so it strips tags
// down to readable plain text instead of pulling in a new native dependency
// just for this one screen.
export const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<(p|div|br|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "’")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export default stripHtml;

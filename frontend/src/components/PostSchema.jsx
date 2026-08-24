import { JsonLd } from "./JsonLd";
import { POST_TYPES } from "../content/postTypes";
import { brandingAssetUrl } from "../context/BrandingContext";

// Mirrors Faq.jsx's inline FaqSchema pattern. jsonLdType comes from
// postTypes.js (BlogPosting/NewsArticle/Article) — see that file's own
// comment for why the mapping is a deliberate SEO choice, not cosmetic.
// articleBody uses `post.bodyText` (plain text) — NEVER `post.body`
// (sanitized HTML) — preserving the exact safety invariant JsonLd.jsx's
// own comment documents for every other JSON-LD block in this app.
export const PostSchema = ({ post, url, platformName, logoUrl }) => {
  const jsonLdType = POST_TYPES[post.type]?.jsonLdType || "Article";
  const data = {
    "@context": "https://schema.org",
    "@type": jsonLdType,
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    articleBody: post.bodyText || "",
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author: {
      "@type": "Organization",
      name: post.authorName || platformName,
    },
    publisher: {
      "@type": "Organization",
      name: platformName,
      logo: logoUrl ? { "@type": "ImageObject", url: brandingAssetUrl(logoUrl) } : undefined,
    },
    image: post.coverImageUrl ? [brandingAssetUrl(post.coverImageUrl)] : undefined,
  };
  return <JsonLd data={data} />;
};

export default PostSchema;

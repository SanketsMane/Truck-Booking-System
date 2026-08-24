// Single source of truth mapping each Post `type` to its public route,
// display copy, and schema.org type — read by both the admin Posts
// list/editor and the public PostList/PostDetail/PostSchema components so
// the three content types never drift out of sync with each other.
//
// jsonLdType is a deliberate SEO detail, not cosmetic: BlogPosting for
// evergreen blog content, NewsArticle for news (the only one eligible for
// Google News/Top Stories surfaces), Article for updates (an honest
// generic parent for changelog-style entries). See PostSchema.jsx.
export const POST_TYPES = {
  blog: {
    type: "blog",
    label: "Blog",
    basePath: "/blog",
    listTitle: "Blog",
    listDescription: "Guides, stories, and insights from the Truckgee team.",
    jsonLdType: "BlogPosting",
  },
  news: {
    type: "news",
    label: "News",
    basePath: "/news",
    listTitle: "News",
    listDescription: "Company news and announcements from Truckgee.",
    jsonLdType: "NewsArticle",
  },
  update: {
    type: "update",
    label: "Update",
    basePath: "/updates",
    listTitle: "Product updates",
    listDescription: "What's new and improved on Truckgee.",
    jsonLdType: "Article",
  },
};

export const POST_TYPE_LIST = Object.values(POST_TYPES);

export const postUrl = (post) => `${POST_TYPES[post.type]?.basePath || ""}/${post.slug}`;

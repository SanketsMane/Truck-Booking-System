// Verbatim from frontend/src/content/postTypes.js — single source of truth
// mapping each Post `type` to its display copy, kept identical across both
// clients so the three content types never drift out of sync.
export const POST_TYPES = {
  blog: {
    type: "blog",
    label: "Blog",
    listTitle: "Blog",
    listDescription: "Guides, stories, and insights from the Truckgee team.",
  },
  news: {
    type: "news",
    label: "News",
    listTitle: "News",
    listDescription: "Company news and announcements from Truckgee.",
  },
  update: {
    type: "update",
    label: "Update",
    listTitle: "Product updates",
    listDescription: "What's new and improved on Truckgee.",
  },
};

export const POST_TYPE_LIST = Object.values(POST_TYPES);

export default POST_TYPES;

import { api, withPaginationParams } from "./client";

// Public reads for blog/news/update posts — no auth. `type` in opts filters
// to one content type; omit it for the combined feed.
export const listPosts = (opts) => api.get(withPaginationParams("/content/posts", opts));

export const getPost = (slug) => api.get(`/content/posts/${slug}`);

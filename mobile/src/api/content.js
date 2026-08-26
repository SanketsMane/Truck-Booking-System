import { api, withPaginationParams } from "./client";

// Same public, unauthenticated endpoints as frontend/src/api/content.js —
// `type` in opts filters to one content type ("blog"|"news"|"update");
// omit it for the combined feed.
export const listPosts = (opts) => api.get(withPaginationParams("/content/posts", opts));

export const getPost = (slug) => api.get(`/content/posts/${slug}`);

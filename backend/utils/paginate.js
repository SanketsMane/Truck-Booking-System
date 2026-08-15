// Shared page/limit parsing + response shaping — the first paginated
// endpoints in this codebase (every existing admin list hard-caps at 100
// with no page param at all), so this is the one place that convention
// lives rather than each new controller reinventing skip/limit math.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const paginatedResponse = (items, total, page, limit) => ({
  items,
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { getPagination, paginatedResponse };

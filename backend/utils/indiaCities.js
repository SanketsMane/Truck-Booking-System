const allCities = require("all-the-cities");
const { DEFAULT_COUNTRY_CODE } = require("../config/marketplaceConfig");

// Sourced from GeoNames via the all-the-cities package — no external API
// call needed, so this has no rate limit, no API key, and no dependency on
// a third party's uptime for something as core as trip search.
//
// Some names (e.g. "Udaipur") appear more than once across different
// districts; a plain city-name field has no state to disambiguate with, so
// duplicates are collapsed to whichever entry has the larger population —
// almost always the place someone actually means.
const byName = new Map();
allCities
  .filter((c) => c.country === DEFAULT_COUNTRY_CODE)
  .forEach((c) => {
    const existing = byName.get(c.name);
    if (!existing || c.population > existing.population) {
      byName.set(c.name, c);
    }
  });

const INDIA_CITIES = Array.from(byName.values()).sort((a, b) => b.population - a.population);

// Prefix matches first (most relevant), then substring matches, both still
// ranked by population within their group.
const searchCities = (query, limit = 10) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const starts = [];
  const contains = [];
  for (const city of INDIA_CITIES) {
    const name = city.name.toLowerCase();
    if (name.startsWith(q)) {
      starts.push(city.name);
      if (starts.length >= limit) break;
    } else if (name.includes(q) && contains.length < limit) {
      contains.push(city.name);
    }
  }

  return [...starts, ...contains].slice(0, limit);
};

module.exports = { searchCities };

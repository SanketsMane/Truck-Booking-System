import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Single source of truth for public/sitemap.xml — runs as a `prebuild` step
// (see package.json) so the file can't drift out of sync with
// routing/Routing.jsx the way a hand-maintained XML file did. Only
// unauthenticated, indexable marketing routes belong here — everything
// behind AuthGuard/AdminGuard, and per-trip pages (ephemeral, user-specific)
// are deliberately excluded.
const SITE_URL = "https://truckgee.com";

const ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/search", changefreq: "hourly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/for-shippers", changefreq: "monthly", priority: "0.7" },
  { path: "/help", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

const today = new Date().toISOString().slice(0, 10);

const body = ROUTES.map(
  ({ path, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), "../public/sitemap.xml");
writeFileSync(outPath, xml);
console.log(`Generated sitemap.xml with ${ROUTES.length} URLs`);

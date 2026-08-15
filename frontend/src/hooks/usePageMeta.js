import { useEffect } from "react";
import { useBranding } from "../context/BrandingContext";

const upsertMeta = (selector, attrs) => {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== "content") el.setAttribute(key, value);
    });
    document.head.appendChild(el);
  }
  el.setAttribute("content", attrs.content);
};

const upsertCanonical = (href) => {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

// Per-page browser-tab title + meta description/OG/Twitter tags — the
// realistic SEO ceiling for a client-rendered app with no SSR (this is a
// plain Vite + React Router SPA, no server-side HTML generation). A non-JS
// crawler/scraper only ever sees index.html's static defaults regardless of
// route, but Google's crawler — and most social-share scrapers — execute
// JS and pick these up. Title itself is routed through
// BrandingContext.setPageTitle rather than writing document.title directly
// here — see the comment on BrandingProvider's `pageTitle` state for why
// (avoids a real effect-ordering race with the provider's own title write).
export const usePageMeta = ({ title, description }) => {
  const { setPageTitle } = useBranding();

  useEffect(() => {
    setPageTitle(title || null);
    return () => setPageTitle(null);
  }, [title, setPageTitle]);

  useEffect(() => {
    if (!description) return;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    if (title) {
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }
    upsertCanonical(`${window.location.origin}${window.location.pathname}`);
  }, [title, description]);
};

export default usePageMeta;

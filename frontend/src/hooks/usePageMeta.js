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

const removeMeta = (selector) => document.querySelector(selector)?.remove();

// index.html's static defaults — the site icon and "website" og:type. Any
// page that sets `image`/`type` (currently only PostDetail.jsx, via its
// post cover image) must restore these on unmount, or navigating from a
// post to any other page would leave that post's cover image/article type
// as the site-wide OG tags for whatever the user visits next.
const DEFAULT_OG_IMAGE = "https://truckgee.com/icons/icon-512.png";
const DEFAULT_OG_TYPE = "website";

// Per-page browser-tab title + meta description/OG/Twitter tags — the
// realistic SEO ceiling for a client-rendered app with no SSR (this is a
// plain Vite + React Router SPA, no server-side HTML generation). A non-JS
// crawler/scraper only ever sees index.html's static defaults regardless of
// route, but Google's crawler — and most social-share scrapers — execute
// JS and pick these up. Title itself is routed through
// BrandingContext.setPageTitle rather than writing document.title directly
// here — see the comment on BrandingProvider's `pageTitle` state for why
// (avoids a real effect-ordering race with the provider's own title write).
// image/type/publishedTime/modifiedTime/canonicalPath are all optional and
// additive — every existing caller above passes none of them and is
// unaffected. Built for content.PostDetail.jsx: a post's cover image as
// og:image/twitter:image, "article" as og:type, and the article: time tags
// Google/social scrapers read for a blog/news/update page.
export const usePageMeta = ({ title, description, image, type, publishedTime, modifiedTime, canonicalPath }) => {
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
    upsertCanonical(`${window.location.origin}${canonicalPath ?? window.location.pathname}`);
  }, [title, description, canonicalPath]);

  useEffect(() => {
    if (!image && !type) return undefined;
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    }
    if (type) {
      upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    }
    if (publishedTime) {
      upsertMeta('meta[property="article:published_time"]', {
        property: "article:published_time",
        content: publishedTime,
      });
    }
    if (modifiedTime) {
      upsertMeta('meta[property="article:modified_time"]', {
        property: "article:modified_time",
        content: modifiedTime,
      });
    }
    return () => {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: DEFAULT_OG_IMAGE });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: DEFAULT_OG_IMAGE });
      upsertMeta('meta[property="og:type"]', { property: "og:type", content: DEFAULT_OG_TYPE });
      removeMeta('meta[property="article:published_time"]');
      removeMeta('meta[property="article:modified_time"]');
    };
  }, [image, type, publishedTime, modifiedTime]);
};

export default usePageMeta;

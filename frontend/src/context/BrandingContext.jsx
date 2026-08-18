import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getBranding } from "../api/meta";
import { BASE_URL } from "../api/client";

const BrandingContext = createContext(null);

// Today's hardcoded look, used until the fetch resolves (and forever, for
// an admin who hasn't touched Settings) — nothing should ever render blank
// while this loads.
const DEFAULT_BRANDING = {
  platformName: "Truckgee",
  logoUrl: "",
  faviconUrl: "",
  contactEmail: "",
  contactMobile: "",
  kycSupportWhatsapp: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
};

// A relative /files/:id path from the backend becomes an absolute,
// plain-<img>-loadable URL — these are always public assets (logo/
// favicon), so no credentialed blob-fetch dance is needed here, unlike
// private files (see api/files.js's fetchBlobUrl).
export const brandingAssetUrl = (path) => (path ? `${BASE_URL}${path}` : "");

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  // Set by usePageMeta (frontend/src/hooks/usePageMeta.js) so a routed page
  // can own the browser-tab title without racing this provider's own write.
  // Deliberately routed through one piece of state rather than having both
  // this effect and a page's effect independently assign document.title —
  // React fires child effects before parent effects, so on the
  // loading:true->false transition a page's title write (child) would run
  // BEFORE this provider's (parent) and get silently overwritten back to
  // the bare platform name. Making this the single writer, recomputed from
  // both pageTitle and platformName, removes the race entirely instead of
  // trying to out-order it.
  const [pageTitle, setPageTitle] = useState(null);

  const refreshBranding = useCallback(async () => {
    try {
      const { branding: fresh } = await getBranding();
      setBranding(fresh);
      return fresh;
    } catch {
      // Public config with a static, safe local fallback — a failed fetch
      // (offline, backend momentarily down) shouldn't block the app from
      // rendering with today's default look.
      return DEFAULT_BRANDING;
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      await refreshBranding();
      if (!ignore) setLoading(false);
    };
    load();
    return () => {
      ignore = true;
    };
  }, [refreshBranding]);

  // index.html's <title>/<link rel="icon"> render before this app mounts —
  // there's no server-rendering layer to inject admin-configured values
  // into that static file, so patch the live DOM once branding loads
  // instead. A brief flash of the default favicon on first load is the
  // accepted tradeoff for a client-rendered app with no SSR.
  useEffect(() => {
    if (loading) return;
    document.title = pageTitle ? `${pageTitle} | ${branding.platformName}` : branding.platformName;

    if (branding.faviconUrl) {
      const href = brandingAssetUrl(branding.faviconUrl);
      document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
        link.setAttribute("href", href);
      });
    }
  }, [loading, pageTitle, branding.platformName, branding.faviconUrl]);

  const value = { ...branding, loading, refreshBranding, setPageTitle };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within a BrandingProvider");
  return ctx;
};

export default BrandingContext;

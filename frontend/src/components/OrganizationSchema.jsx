import { useBranding, brandingAssetUrl } from "../context/BrandingContext";
import { JsonLd } from "./JsonLd";

// Sitewide schema.org/Organization block, rendered once from the public
// Layout (not per-page) — associates the brand name/logo with this domain
// for search engines. Reads live branding so a white-labeled deployment
// (admin-configured name/logo, see admin Settings > Branding) gets correct
// structured data with no code change.
export const OrganizationSchema = () => {
  const { platformName, logoUrl, contactEmail, loading } = useBranding();

  if (loading || typeof window === "undefined") return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: platformName,
    url: window.location.origin,
    ...(logoUrl ? { logo: brandingAssetUrl(logoUrl) } : {}),
    ...(contactEmail ? { email: contactEmail } : {}),
  };

  return <JsonLd data={data} />;
};

export default OrganizationSchema;

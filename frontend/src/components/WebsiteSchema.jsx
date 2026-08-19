import { useBranding } from "../context/BrandingContext";
import { JsonLd } from "./JsonLd";

// schema.org/WebSite block, mounted on the homepage only (OrganizationSchema
// already covers every page). No `potentialAction`/SearchAction — that
// schema requires a single free-text query mapped to one URL param, but the
// actual search form here takes fromCity + toCity + date together, so a
// SearchAction would describe a query shape the site doesn't accept.
export const WebsiteSchema = () => {
  const { platformName, loading } = useBranding();

  if (loading || typeof window === "undefined") return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: platformName,
    url: window.location.origin,
  };

  return <JsonLd data={data} />;
};

export default WebsiteSchema;

import styled from "styled-components";
import { useBranding, brandingAssetUrl } from "../../context/BrandingContext";
import defaultLogo from "../../assets/brand-mark.png";

// The one shared "brand mark" square used everywhere the app shows its own
// identity (Navbar, Footer, AuthShell, DashboardShell). Renders the
// admin-uploaded logo once one exists (useBranding().logoUrl); otherwise
// falls back to Truckgee's own mark, bundled at build time — so every
// deployment shows the real logo without an admin having to configure
// branding first. Callers pass the same size/radius their local mark
// already used, to preserve each context's existing layout (e.g. the admin
// sidebar's own sizing) rather than forcing one everywhere.
const Box = styled.span`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: none;
  border-radius: ${({ $radius, theme }) => $radius || theme.radius.sm};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const LogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3px;
`;

export const BrandLogo = ({ size = 32, radius, className }) => {
  const { logoUrl, platformName } = useBranding();

  return (
    <Box $size={size} $radius={radius} className={className}>
      <LogoImg src={logoUrl ? brandingAssetUrl(logoUrl) : defaultLogo} alt={platformName} />
    </Box>
  );
};

export default BrandLogo;

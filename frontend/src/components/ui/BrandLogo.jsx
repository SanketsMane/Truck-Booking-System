import styled from "styled-components";
import { Truck } from "lucide-react";
import { useBranding, brandingAssetUrl } from "../../context/BrandingContext";

// The one shared "brand mark" square used everywhere the app shows its own
// identity (Navbar, Footer, AuthShell, DashboardShell). Renders the
// admin-uploaded logo once one exists; otherwise falls back to exactly the
// colored-square-plus-truck-icon mark this app already used everywhere, so
// an unconfigured deployment looks pixel-identical to before this existed.
// Callers pass the same size/background/radius/glow their local mark
// already used, to preserve each context's exact existing look (e.g. the
// admin sidebar's own color scheme) rather than forcing one visual style
// everywhere.
const Box = styled.span`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: none;
  border-radius: ${({ $radius, theme }) => $radius || theme.radius.sm};
  background: ${({ $hasLogo, $background, theme }) => ($hasLogo ? theme.color.surface : $background || theme.color.accent)};
  box-shadow: ${({ $hasLogo, $glow, theme }) => ($hasLogo ? "none" : $glow ?? theme.shadow.accentGlow)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: ${({ $iconColor, theme }) => $iconColor || theme.color.onAccent};
`;

const LogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3px;
`;

export const BrandLogo = ({ size = 32, iconSize, background, radius, iconColor, glow, className }) => {
  const { logoUrl, platformName } = useBranding();

  return (
    <Box
      $size={size}
      $hasLogo={Boolean(logoUrl)}
      $background={background}
      $radius={radius}
      $iconColor={iconColor}
      $glow={glow}
      className={className}
    >
      {logoUrl ? (
        <LogoImg src={brandingAssetUrl(logoUrl)} alt={platformName} />
      ) : (
        <Truck size={iconSize || Math.round(size * 0.56)} strokeWidth={2.4} />
      )}
    </Box>
  );
};

export default BrandLogo;

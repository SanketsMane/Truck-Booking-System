import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  Search,
  PlayCircle,
  ShieldCheck,
  HelpCircle,
  Headset,
  Truck as TruckGlyph,
  ClipboardList,
  Calculator,
  Building2,
  Briefcase,
  FileText,
  Megaphone,
  Mail,
  Shield,
  XCircle,
  Info,
  Globe,
} from "lucide-react";
import { useBranding } from "../context/BrandingContext";
import { BrandLogo } from "../components/ui/BrandLogo";
import { SOCIAL_PLATFORMS } from "../components/ui/SocialIcons";

// Column accent colors — specific to this one dark surface, not part of the
// shared (light) theme palette, so they live here rather than in theme.js.
const COLORS = {
  blue: "#60a5fa",
  green: "#34d399",
  orange: "#fb923c",
  lavender: "#a5b4fc",
};

const Wrap = styled.footer`
  background: ${({ theme }) => theme.admin.color.navy};
  color: #cbd5e1;
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(25)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(12)} ${({ theme }) => theme.space(6)}
      ${({ theme }) => theme.space(10)};
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const TopGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(8)};

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    flex-direction: row;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space(6)};
  }
`;

const BrandCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  max-width: 320px;
`;

const LogoRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 20px;
  color: #ffffff;
`;

const BrandTagline = styled.p`
  margin: 0;
  font-weight: 700;
  font-size: 14px;
  color: #ffffff;
`;

const BrandDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
`;

const ContactLine = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;

  a {
    color: #94a3b8;
    transition: color ${({ theme }) => theme.motion.fast} ease;

    &:hover {
      color: #ffffff;
    }
  }
`;

const SocialRow = styled.div`
  display: flex;
  gap: 8px;
`;

const SocialButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #cbd5e1;
  transition: border-color ${({ theme }) => theme.motion.fast} ease, color ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
    color: #ffffff;
  }
`;

const WebsitePill = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  transition: border-color ${({ theme }) => theme.motion.fast} ease, background ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.32);
  }
`;

const LinksGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(7)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.space(6)};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: repeat(4, minmax(140px, 1fr));
    flex: 1;
  }
`;

const LinkColumn = styled.div`
  position: relative;
`;

const ColumnHeading = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

const ColumnLinkList = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const ColumnLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: #cbd5e1;
  transition: color ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    color: #ffffff;
  }
`;

const ColumnLinkIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  color: ${({ $color }) => $color};
  opacity: 0.9;
`;

const TruckWatermark = styled(TruckGlyph)`
  display: none;
  position: absolute;
  right: -4px;
  bottom: -6px;
  opacity: 0.12;
  pointer-events: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
  }
`;

const Divider = styled.div`
  margin: ${({ theme }) => theme.space(9)} 0 ${({ theme }) => theme.space(5)};
  border-top: 1px solid ${({ theme }) => theme.admin.color.navyBorder};
`;

const BottomBar = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const COLUMN_ICON_MAP = {
  Search,
  PlayCircle,
  ShieldCheck,
  HelpCircle,
  Headset,
  TruckGlyph,
  ClipboardList,
  Calculator,
  Building2,
  Briefcase,
  FileText,
  Megaphone,
  Mail,
  Shield,
  XCircle,
  Info,
};

export const Footer = () => {
  const branding = useBranding();
  const { platformName, contactEmail, contactMobile } = branding;
  const hasContact = Boolean(contactEmail || contactMobile);
  // Only platforms an admin has actually configured a URL for show up here —
  // no dead/decorative icons pointing nowhere (frontend/src/pages/admin/Settings.jsx's
  // "Social links" subsection is where those URLs get set).
  const socialLinks = SOCIAL_PLATFORMS.map(({ key, icon, label }) => ({
    icon,
    label,
    url: branding[key],
  })).filter((s) => s.url);

  const columns = [
    {
      heading: "For Shippers",
      color: COLORS.blue,
      watermark: true,
      items: [
        { label: "Find Truck Capacity", icon: COLUMN_ICON_MAP.Search, to: "/" },
        { label: "How It Works", icon: COLUMN_ICON_MAP.PlayCircle, to: "/about#how-it-works" },
        { label: `Why ${platformName}`, icon: COLUMN_ICON_MAP.ShieldCheck, to: "/for-shippers" },
        { label: "Help Center", icon: COLUMN_ICON_MAP.HelpCircle, to: "/help" },
        { label: "Contact Support", icon: COLUMN_ICON_MAP.Headset, to: "/support" },
      ],
    },
    {
      heading: "For Transporters",
      color: COLORS.green,
      watermark: true,
      items: [
        { label: "List Your Truck", icon: COLUMN_ICON_MAP.TruckGlyph, to: "/trips/new" },
        { label: "Manage Capacity", icon: COLUMN_ICON_MAP.ClipboardList, to: "/trucks" },
        { label: "How It Works", icon: COLUMN_ICON_MAP.PlayCircle, to: "/about#how-it-works" },
        { label: "Earnings Calculator", icon: COLUMN_ICON_MAP.Calculator, to: "/trips/new" },
        { label: "Transporter Support", icon: COLUMN_ICON_MAP.Headset, to: "/support" },
      ],
    },
    {
      heading: "Company",
      color: COLORS.orange,
      items: [
        { label: `About ${platformName}`, icon: COLUMN_ICON_MAP.Building2, to: "/about" },
        { label: "Careers", icon: COLUMN_ICON_MAP.Briefcase, to: "/support" },
        { label: "Blog", icon: COLUMN_ICON_MAP.FileText, to: "/blog" },
        { label: "News", icon: COLUMN_ICON_MAP.Megaphone, to: "/news" },
        { label: "Product Updates", icon: COLUMN_ICON_MAP.Megaphone, to: "/updates" },
        { label: "Contact Us", icon: COLUMN_ICON_MAP.Mail, to: "/support" },
      ],
    },
    {
      heading: "Legal",
      color: COLORS.lavender,
      items: [
        { label: "Terms & Conditions", icon: COLUMN_ICON_MAP.FileText, to: "/terms" },
        { label: "Privacy Policy", icon: COLUMN_ICON_MAP.Shield, to: "/privacy" },
        { label: "Cancellation Policy", icon: COLUMN_ICON_MAP.XCircle, to: "/faq#cancel-my-shipment" },
        { label: "Disclaimer", icon: COLUMN_ICON_MAP.Info, to: "/terms" },
      ],
    },
  ];

  return (
    <Wrap>
      <Inner>
        <TopGrid>
          <BrandCol>
            <LogoRow to="/">
              <BrandLogo size={36} />
              {platformName}
            </LogoRow>
            <BrandTagline>Ship less. Earn from empty space.</BrandTagline>
            <BrandDescription>
              India's smart truck capacity marketplace that connects shippers with transporters to
              move more, together.
            </BrandDescription>
            {hasContact && (
              <ContactLine>
                {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
                {contactEmail && contactMobile && " · "}
                {contactMobile && <a href={`tel:+91${contactMobile}`}>{contactMobile}</a>}
              </ContactLine>
            )}
            {socialLinks.length > 0 && (
              <SocialRow>
                {socialLinks.map(({ icon: Icon, label, url }) => (
                  <SocialButton key={label} href={url} target="_blank" rel="noreferrer" aria-label={label}>
                    <Icon />
                  </SocialButton>
                ))}
              </SocialRow>
            )}
            <WebsitePill to="/">
              <Globe size={15} strokeWidth={2.2} />
              {platformName}.com
            </WebsitePill>
          </BrandCol>

          <LinksGrid>
            {columns.map((col) => (
              <LinkColumn key={col.heading}>
                <ColumnHeading $color={col.color}>{col.heading}</ColumnHeading>
                <ColumnLinkList>
                  {col.items.map((item) => (
                    <ColumnLink key={item.label} to={item.to}>
                      <ColumnLinkIcon $color={col.color}>
                        <item.icon size={14} strokeWidth={2.2} />
                      </ColumnLinkIcon>
                      {item.label}
                    </ColumnLink>
                  ))}
                </ColumnLinkList>
                {col.watermark && <TruckWatermark size={64} strokeWidth={1} color={col.color} />}
              </LinkColumn>
            ))}
          </LinksGrid>
        </TopGrid>

        <Divider />
        <BottomBar>
          © {new Date().getFullYear()} {platformName}. All rights reserved.
        </BottomBar>
      </Inner>
    </Wrap>
  );
};

export default Footer;

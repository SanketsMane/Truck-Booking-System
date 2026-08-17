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

// Column accent colors — specific to this one dark surface, not part of the
// shared (light) theme palette, so they live here rather than in theme.js.
const COLORS = {
  blue: "#60a5fa",
  green: "#34d399",
  orange: "#fb923c",
  lavender: "#a5b4fc",
};

// lucide-react dropped brand/social icons a while back (trademark reasons)
// — these mirror Feather Icons' old facebook/instagram/linkedin/youtube
// glyphs (same open icon set lucide forked from) so the social row still
// reads as the real platforms instead of generic shapes.
const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M15 8.5h2.5V5.5H15A3.5 3.5 0 0 0 11.5 9v2H9v3h2.5v7h3v-7H17l.5-3h-3V9a.5.5 0 0 1 .5-.5Z"
    />
  </svg>
);

const InstagramIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const YoutubeIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33Z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
  </svg>
);

// Decorative only — no real social profile URLs exist yet, so these are
// buttons (not links to guessed URLs), styled identically to how they'd
// look as links. Swap to <a href> once real profile URLs exist.
const SOCIAL_ICONS = [
  { icon: FacebookIcon, label: "Facebook" },
  { icon: InstagramIcon, label: "Instagram" },
  { icon: LinkedinIcon, label: "LinkedIn" },
  { icon: YoutubeIcon, label: "YouTube" },
];

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

const SocialButton = styled.button`
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
  const { platformName, contactEmail, contactMobile } = useBranding();
  const hasContact = Boolean(contactEmail || contactMobile);

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
        { label: "Blog", icon: COLUMN_ICON_MAP.FileText, to: "/about" },
        { label: "News & Updates", icon: COLUMN_ICON_MAP.Megaphone, to: "/about" },
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
            <SocialRow>
              {SOCIAL_ICONS.map(({ icon: Icon, label }) => (
                <SocialButton key={label} type="button" aria-label={label}>
                  <Icon />
                </SocialButton>
              ))}
            </SocialRow>
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

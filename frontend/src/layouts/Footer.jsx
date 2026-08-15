import styled from "styled-components";
import { Link } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";
import { BrandLogo } from "../components/ui/BrandLogo";

const Wrap = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding: ${({ theme }) => theme.space(9)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(25)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(9)} ${({ theme }) => theme.space(6)};
  }
`;

const Inner = styled.div`
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(8)};
`;

const Top = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 280px;
`;

const BrandRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

const Tagline = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textMuted};
`;

const LinkGroups = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(9)};
`;

const LinkGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const GroupTitle = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textFaint};
`;

const GroupLink = styled(Link)`
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Bottom = styled.div`
  padding-top: ${({ theme }) => theme.space(6)};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

export const Footer = () => {
  const { platformName, contactEmail, contactMobile } = useBranding();
  const hasContact = Boolean(contactEmail || contactMobile);

  return (
    <Wrap>
      <Inner>
        <Top>
          <Brand>
            <BrandRow to="/">
              <BrandLogo size={28} iconSize={15} glow="none" />
              {platformName}
            </BrandRow>
            <Tagline>India's truck capacity marketplace — find or share spare space on routes you already run.</Tagline>
          </Brand>

          <LinkGroups>
            <LinkGroup>
              <GroupTitle>Company</GroupTitle>
              <GroupLink to="/about">About</GroupLink>
              <GroupLink to="/help">Help</GroupLink>
              <GroupLink to="/support">Support</GroupLink>
            </LinkGroup>
            <LinkGroup>
              <GroupTitle>Legal</GroupTitle>
              <GroupLink to="/terms">Terms</GroupLink>
              <GroupLink to="/privacy">Privacy</GroupLink>
            </LinkGroup>
            {hasContact && (
              <LinkGroup>
                <GroupTitle>Contact</GroupTitle>
                {contactEmail && <GroupLink as="a" href={`mailto:${contactEmail}`}>{contactEmail}</GroupLink>}
                {contactMobile && <GroupLink as="a" href={`tel:+91${contactMobile}`}>{contactMobile}</GroupLink>}
              </LinkGroup>
            )}
          </LinkGroups>
        </Top>

        <Bottom>© {new Date().getFullYear()} {platformName}</Bottom>
      </Inner>
    </Wrap>
  );
};

export default Footer;

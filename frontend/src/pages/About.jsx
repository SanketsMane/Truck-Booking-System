import styled from "styled-components";
import { Link } from "react-router-dom";
import { ShieldCheck, MapPin, Gift, Search, Truck } from "lucide-react";
import { PageContainer, PageTitle, SectionTitle, SubHeading, Stack, Grid, Body, Muted } from "../components/ui/Layout";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";

const Tagline = styled.p`
  margin: 0;
  font-weight: 700;
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.color.accentStrong};
`;

const Lede = styled(Body)`
  font-size: ${({ theme }) => theme.font.size.lg};
`;

const VisionCard = styled.div`
  padding: ${({ theme }) => theme.space(5)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accentSoft};
`;

const VisionStatement = styled.p`
  margin: 0 0 8px;
  font-weight: 700;
  font-size: ${({ theme }) => theme.font.size.lg};
  color: ${({ theme }) => theme.color.accentStrong};
`;

const RoleCard = styled.div`
  padding: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const RoleIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

const TrustGrid = styled(Grid)`
  margin-top: ${({ theme }) => theme.space(2)};
`;

const TrustItem = styled(Stack)`
  align-items: flex-start;
`;

const TrustIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
`;

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Every account is verified",
    body: "Shippers and transporters both submit KYC documents — Aadhaar, PAN, a driving licence, or a business certificate — reviewed before they can accept or confirm a booking.",
  },
  {
    icon: MapPin,
    title: "Status updates, pickup to drop",
    body: "A booking's status is visible in the app the whole way — confirmed, picked up, delivered — no guessing where things stand.",
  },
  {
    icon: Gift,
    title: "100% free to use",
    body: "The platform never touches your money. No commission, no listing fees — agree a price, get the job done, and settle directly with the other party.",
  },
];

export const About = () => {
  const { platformName, contactEmail, contactMobile } = useBranding();
  const hasContact = Boolean(contactEmail || contactMobile);

  usePageMeta({
    title: "About us",
    description: `${platformName} is a marketplace connecting shippers with partial loads to transporters with spare truck capacity on the same route.`,
  });

  return (
    <PageContainer>
      <Stack $gap={7}>
        <Stack $gap={3}>
          <Tagline>Your Load. Their Empty Space.</Tagline>
          <PageTitle>About {platformName}</PageTitle>
          <Lede>
            Every day, thousands of trucks travel across India with some unused space — we believe
            that space shouldn't go to waste. {platformName} connects shippers who need to move
            goods with transporters who already have available capacity on their existing routes.
            Instead of booking an entire truck for a smaller shipment, find a suitable truck already
            travelling your way and use only the space you actually need.
          </Lede>
        </Stack>

        <Stack $gap={4}>
          <SectionTitle>How it works</SectionTitle>
          <Grid $cols={1} $colsTablet={2} $gap={4}>
            <RoleCard>
              <RoleIcon>
                <Search size={18} strokeWidth={2.2} />
              </RoleIcon>
              <SubHeading>For shippers</SubHeading>
              <Body style={{ marginTop: 8, fontWeight: 700 }}>
                Why pay for an entire truck when you only need part of it?
              </Body>
              <Body style={{ marginTop: 4 }}>
                Search a route and date, compare available capacity and price, and book. Once
                accepted, coordinate pickup directly and follow the booking's status the entire way —
                you settle payment with the transporter however works for you.
              </Body>
            </RoleCard>
            <RoleCard>
              <RoleIcon>
                <Truck size={18} strokeWidth={2.2} />
              </RoleIcon>
              <SubHeading>For transporters</SubHeading>
              <Body style={{ marginTop: 8, fontWeight: 700 }}>
                Don't let empty space travel empty.
              </Body>
              <Body style={{ marginTop: 4 }}>
                List a trip with the capacity you have spare, and accept booking requests as they
                come in. Deliver and get paid directly by the shipper — earning from space you were
                already paying to move, with zero commission taken by the platform.
              </Body>
            </RoleCard>
          </Grid>
        </Stack>

        <VisionCard>
          <SectionTitle style={{ marginBottom: 8 }}>Our vision</SectionTitle>
          <VisionStatement>
            A road freight network where empty truck capacity doesn't go unused.
          </VisionStatement>
          <Body>
            We want to make road transportation more connected, transparent and efficient by
            turning fragmented, unused capacity into an accessible marketplace for businesses of
            all sizes.
          </Body>
        </VisionCard>

        <Stack $gap={4}>
          <SectionTitle>Built to be safe to use</SectionTitle>
          <Body>
            Handing a shipment — or your truck's spare capacity — to a stranger only works if both
            sides can trust the platform in between. Every part of a booking is built around that:
          </Body>
          <TrustGrid $cols={1} $colsTablet={3} $gap={5}>
            {TRUST_POINTS.map(({ icon: Icon, title, body }) => (
              <TrustItem key={title} $gap={2}>
                <TrustIcon>
                  <Icon size={19} strokeWidth={2.2} />
                </TrustIcon>
                <SubHeading style={{ fontSize: "15px" }}>{title}</SubHeading>
                <Body>{body}</Body>
              </TrustItem>
            ))}
          </TrustGrid>
        </Stack>

        <Stack $gap={3}>
          <SectionTitle>Where we operate</SectionTitle>
          <Body>
            {platformName} is live across India — search any city pair on the{" "}
            <Link to="/">home page</Link> to see what's currently available on your route.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>Questions?</SectionTitle>
          <Body>
            Read our <Link to="/help">Help</Link> center for how bookings, pricing, and
            cancellations work, or reach our team directly.
          </Body>
          {hasContact && (
            <Muted>
              {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
              {contactEmail && contactMobile && " · "}
              {contactMobile && <a href={`tel:+91${contactMobile}`}>{contactMobile}</a>}
            </Muted>
          )}
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default About;

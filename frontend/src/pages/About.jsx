import styled from "styled-components";
import { Link } from "react-router-dom";
import { ShieldCheck, MapPin, Wallet, Search, Truck } from "lucide-react";
import { PageContainer, PageTitle, SectionTitle, SubHeading, Stack, Grid, Body, Muted } from "../components/ui/Layout";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";

const Lede = styled(Body)`
  font-size: ${({ theme }) => theme.font.size.lg};
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
    title: "Tracked from pickup to drop",
    body: "Once a booking is on the road, its live location is visible in the app the whole way — no guessing where a shipment is.",
  },
  {
    icon: Wallet,
    title: "Payment held until delivery",
    body: "Booking payments go through the app — wallet balance or a supported payment gateway — and stay held until the delivery is confirmed on both ends.",
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
          <PageTitle>About {platformName}</PageTitle>
          <Lede>
            A truck rarely runs full both ways. A transporter delivers a full load one direction
            and often drives the return leg with space going to waste — while, at the same time,
            a shipper with a partial load pays for a full dedicated truck they don't need.{" "}
            {platformName} exists to close that gap: a marketplace where transporters list the
            spare capacity they already have, and shippers book exactly the space they need, on
            routes trucks are already running.
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
              <Body style={{ marginTop: 8 }}>
                Search a route and date, compare available capacity and price, and book. Payment
                is held safely until your goods are delivered, and you can track the shipment live
                the entire way.
              </Body>
            </RoleCard>
            <RoleCard>
              <RoleIcon>
                <Truck size={18} strokeWidth={2.2} />
              </RoleIcon>
              <SubHeading>For transporters</SubHeading>
              <Body style={{ marginTop: 8 }}>
                List a trip with the capacity you have spare, and accept booking requests as they
                come in. Get paid out to your wallet once a delivery is confirmed — earning from
                space you were already paying to move.
              </Body>
            </RoleCard>
          </Grid>
        </Stack>

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
            {platformName} is live across Delhi-NCR today, with the same marketplace built to
            scale to any route across India. Search a city pair on the{" "}
            <Link to="/">home page</Link> to see what's currently available.
          </Body>
        </Stack>

        <Stack $gap={2}>
          <SectionTitle>Questions?</SectionTitle>
          <Body>
            Read our <Link to="/help">Help</Link> center for how bookings, payments, and
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

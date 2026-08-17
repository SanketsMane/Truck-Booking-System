import styled from "styled-components";
import { Link } from "react-router-dom";
import { IndianRupee, Search, Route, Users, Eye } from "lucide-react";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Grid, Body, Muted } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
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

const ReasonGrid = styled(Grid)`
  margin-top: ${({ theme }) => theme.space(2)};
`;

const ReasonCard = styled(Stack)`
  align-items: flex-start;
  padding: ${({ theme }) => theme.space(5)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
`;

const ReasonNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
`;

const CtaBand = styled(Stack)`
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.space(7)} ${({ theme }) => theme.space(5)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accentSoft};
`;

const CtaHeadline = styled.p`
  margin: 0;
  max-width: 480px;
  font-weight: 700;
  font-size: ${({ theme }) => theme.font.size.lg};
  color: ${({ theme }) => theme.color.text};
`;

export const ForShippers = () => {
  const { platformName } = useBranding();

  usePageMeta({
    title: "Why TruckGee — For Shippers",
    description: `Reasons to choose ${platformName} as a shipper: lower cost, route-based matching, direct connections with verified transporters, and zero commission.`,
  });

  // Verbatim reasons from "TruckGee — Why TruckGee? (For Shippers)" — the
  // numbering matches that source document; only claims the product
  // actually backs (no delivery guarantees, payment protection, insurance,
  // etc., per that doc's own note) are made. Built inside the component
  // (not module-scoped) so item 4's body can reference the live
  // {platformName} instead of a hardcoded brand name.
  const REASONS = [
    {
      icon: IndianRupee,
      title: "Lower Transport Cost",
      body: "Use available space on trucks already travelling your route. Pay for the capacity you need instead of arranging a full truck when you don't need one.",
    },
    {
      icon: Search,
      title: "Find Capacity Already on the Road",
      body: "Discover spare truck capacity on existing routes and match your shipment with a vehicle already heading in the right direction.",
    },
    {
      icon: Route,
      title: "Route-Based Matching",
      body: "Match pickup and drop locations with trucks travelling along the same route, including suitable points in between.",
    },
    {
      icon: Users,
      title: "Connect Directly with Transporters",
      body: `Connect with verified transporters, discuss shipment details and agree on the price directly. ${platformName} does not take a commission.`,
    },
    {
      icon: Eye,
      title: "Simple & Transparent",
      body: "See available capacity and booking status clearly, without unnecessary platform charges or hidden commissions.",
    },
  ];

  return (
    <PageContainer>
      <Stack $gap={7}>
        <Stack $gap={3}>
          <Tagline>For Shippers</Tagline>
          <PageTitle>Why {platformName}?</PageTitle>
          <Lede>Use the space that's already going your way.</Lede>
        </Stack>

        <ReasonGrid $cols={1} $colsTablet={2} $gap={5}>
          {REASONS.map(({ icon: Icon, title, body }, i) => (
            <ReasonCard key={title} $gap={2}>
              <Row $gap={2}>
                <ReasonNumber>
                  <Icon size={19} strokeWidth={2.2} />
                </ReasonNumber>
                <Muted>{String(i + 1).padStart(2, "0")}</Muted>
              </Row>
              <SectionTitle style={{ fontSize: "17px" }}>{title}</SectionTitle>
              <Body>{body}</Body>
            </ReasonCard>
          ))}
        </ReasonGrid>

        <CtaBand $gap={4}>
          <CtaHeadline>Why book a whole truck when you only need the space?</CtaHeadline>
          <Button as={Link} to="/search" $size="lg">
            Search trucks on your route
          </Button>
        </CtaBand>

        <Stack $gap={2}>
          <SectionTitle>Questions?</SectionTitle>
          <Body>
            See how booking actually works in our <Link to="/faq">FAQ</Link>, or reach out via{" "}
            <Link to="/support">Support</Link>.
          </Body>
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default ForShippers;

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeftRight, ArrowRight, MapPin, Scale, Search, ShieldCheck, SignpostBig, Wallet } from "lucide-react";
import heroHighwaySrc from "../assets/hero-highway.jpg";
import { getPopularRoutes } from "../api/trips";
import { PageContainer, Stack, Row, Muted, SectionTitle } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { CityAutocomplete } from "../components/ui/CityAutocomplete";
import { Spinner } from "../components/ui/Spinner";
import { fadeInUp, blink } from "../theme/animations";
import { toDateInputValue } from "../utils/format";
import { usePageMeta } from "../hooks/usePageMeta";
import { useBranding } from "../context/BrandingContext";
import { FAQ_CATEGORIES } from "../content/faq";

const HeroSection = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.35) 40%,
      ${({ theme }) => theme.color.bg} 100%
    ),
    url(${heroHighwaySrc}) center center / cover no-repeat;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(20)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(14)} ${({ theme }) => theme.space(6)}
      ${({ theme }) => theme.space(24)};
  }
`;

const HeroGlow = styled.div`
  position: absolute;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 720px;
  height: 480px;
  max-width: 140vw;
  background: radial-gradient(circle, ${({ theme }) => theme.color.accentSoft} 0%, transparent 68%);
  pointer-events: none;
`;

const HeroContent = styled.div`
  position: relative;
  max-width: 620px;
  margin: 0 auto;
  text-align: center;
  animation: ${fadeInUp} 0.4s ease;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 13px;
  margin-bottom: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.pill};
  /* Opaque backing (not the shared translucent accentSoft) so the accent
     text stays readable over the hero photo's own warm/dusty tones. */
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 3px rgba(20, 21, 15, 0.1);
  color: ${({ theme }) => theme.color.accentStrong};
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

const TypingCaret = styled.span`
  display: inline-block;
  width: 2px;
  height: 11px;
  margin-left: 2px;
  background: currentColor;
  vertical-align: -1px;
  animation: ${blink} 0.85s step-end infinite;
`;

const TAGLINE = "Now live across Delhi-NCR";

// Types TAGLINE out one character at a time so the Eyebrow badge reads like
// a terminal prompt instead of appearing all at once.
const useTypingEffect = (text, speed = 45) => {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return typed;
};

const HeroTitle = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
  line-height: 1.15;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 2.75rem;
  }
`;

const HeroSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 15.5px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 17px;
  }
`;

const SearchCardWrap = styled.div`
  position: relative;
  max-width: 620px;
  margin: -64px auto 0;
  padding: 0 ${({ theme }) => theme.space(4)};
  z-index: 1;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    margin-top: -72px;
    padding: 0 ${({ theme }) => theme.space(6)};
  }
`;

const SearchCard = styled(Card)`
  box-shadow: ${({ theme }) => theme.shadow.raised};
`;

const SwapRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: ${({ theme }) => theme.space(2)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: 1fr auto 1fr auto;
  }
`;

const SwapButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 6px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.text};
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accent};
  }

  &:active {
    transform: rotate(180deg);
  }
`;

const Section = styled.section`
  padding-top: ${({ theme }) => theme.space(12)};
`;

const SectionHead = styled(Stack).attrs({ $gap: 1 })`
  text-align: center;
  max-width: 480px;
  margin: 0 auto ${({ theme }) => theme.space(7)};
`;

const SectionEyebrow = styled.span`
  display: inline-block;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accentStrong};
  margin-bottom: 2px;
`;

const Band = styled.section`
  margin-top: ${({ theme }) => theme.space(12)};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding: ${({ theme }) => theme.space(12)} ${({ theme }) => theme.space(4)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(14)} ${({ theme }) => theme.space(6)};
  }
`;

const BandInner = styled.div`
  max-width: 960px;
  margin: 0 auto;
`;

const ValueGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(4)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ValueCard = styled.div`
  padding: ${({ theme }) => theme.space(5)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
    box-shadow: ${({ theme }) => theme.shadow.card};
    transform: translateY(-2px);
  }
`;

const ValueIcon = styled.div`
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

const ValueTitle = styled.div`
  font-weight: 700;
  font-size: 15.5px;
  margin-bottom: 5px;
  letter-spacing: -0.01em;
`;

const StepGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(6)};
  counter-reset: step;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(3, 1fr);

    &::before {
      content: "";
      position: absolute;
      top: 17px;
      left: 16.5%;
      right: 16.5%;
      height: 1px;
      background: ${({ theme }) => theme.color.border};
      z-index: 0;
    }
  }
`;

const Step = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
`;

const StepNumber = styled.div`
  width: 34px;
  height: 34px;
  margin: 0 auto 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.text};
  color: ${({ theme }) => theme.color.bg};
  border: 3px solid ${({ theme }) => theme.color.bg};
  box-shadow: 0 0 0 1px ${({ theme }) => theme.color.border};
  font-weight: 700;
  font-size: 14px;
`;

const StepTitle = styled.div`
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 4px;
`;

const RouteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space(3)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const RouteChip = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  text-align: left;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  animation: ${fadeInUp} 0.35s ease both;
  animation-delay: ${({ $i = 0 }) => Math.min($i * 0.04, 0.3)}s;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    background: ${({ theme }) => theme.color.surfaceRaised};
    transform: translateY(-2px);
  }

  &:hover svg {
    transform: translateX(2px);
    color: ${({ theme }) => theme.color.accent};
  }

  &:active {
    transform: translateY(0);
  }
`;

const RouteChipCities = styled.div`
  font-weight: 700;
  font-size: 14.5px;
  margin-bottom: 3px;
`;

const RouteChipCount = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const RouteChipArrow = styled(ArrowRight)`
  flex-shrink: 0;
  color: ${({ theme }) => theme.color.textFaint};
  transition: transform 0.15s ease, color 0.15s ease;
`;

const RouteEmptyState = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(5)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px dashed ${({ theme }) => theme.color.border};
`;

const RouteEmptyIcon = styled.div`
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textFaint};
`;

const FaqGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(3)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FaqCard = styled(Link)`
  display: block;
  padding: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  transition: border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    transform: translateY(-2px);
  }
`;

const FaqQuestion = styled.div`
  font-weight: 700;
  font-size: 14.5px;
  margin-bottom: 4px;
`;

const CtaBanner = styled.div`
  margin-top: ${({ theme }) => theme.space(14)};
  background: ${({ theme }) => theme.color.text};
  color: ${({ theme }) => theme.color.bg};
  padding: ${({ theme }) => theme.space(9)} ${({ theme }) => theme.space(4)};
`;

const CtaInner = styled.div`
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
`;

const CtaTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 8px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 1.7rem;
  }
`;

const CtaSubtitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.space(5)};
  color: rgba(255, 255, 255, 0.72);
  font-size: 14.5px;
`;

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Verified transporters",
    body: "Every transporter is ID-verified before they can list spare capacity.",
  },
  {
    icon: MapPin,
    title: "Track your shipment",
    body: "Live location updates from pickup all the way to drop-off.",
  },
  {
    icon: Wallet,
    title: "Pay securely online",
    body: "Booking payments are held safely until your delivery is confirmed.",
  },
  {
    icon: Scale,
    title: "Backed by real support",
    body: "If something goes wrong, raise it straight from the booking — our team steps in to resolve it.",
  },
];

const STEPS = [
  { title: "Search your route", body: "Tell us where and when — we'll show trucks already heading that way." },
  { title: "Compare & book", body: "Pick a truck by price, capacity and transporter rating, then book in minutes." },
  { title: "Ship with tracking", body: "Follow your shipment live and pay securely once it's delivered." },
];

// The 4 highest-value questions for a first-time visitor deciding whether
// to trust the platform — pulled from the same data Help.jsx renders in
// full (frontend/src/content/faq.js), so the answers can't drift out of
// sync between the two pages.
const HOME_FAQ_IDS = ["how-to-book", "how-payment-works", "cancellations", "disputes"];
const ALL_FAQ_ITEMS = FAQ_CATEGORIES.flatMap((cat) => cat.items);
const HOME_FAQS = HOME_FAQ_IDS.map((id) => ALL_FAQ_ITEMS.find((item) => item.id === id)).filter(Boolean);

export const Home = () => {
  const navigate = useNavigate();
  const { platformName } = useBranding();
  usePageMeta({
    description: `${platformName} — find or share spare truck capacity on routes across India. Verified transporters, live tracking, and secure in-app payments.`,
  });
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(toDateInputValue());
  const [errors, setErrors] = useState({});
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const typedTagline = useTypingEffect(TAGLINE);

  useEffect(() => {
    let cancelled = false;
    getPopularRoutes()
      .then(({ routes }) => {
        if (!cancelled) setRoutes(routes || []);
      })
      .catch(() => {
        if (!cancelled) setRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoutes(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToSearch = (from, to, when) => {
    const params = new URLSearchParams({
      fromCity: from.trim(),
      toCity: to.trim(),
      date: when,
    });
    navigate(`/search?${params}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!fromCity.trim()) nextErrors.fromCity = "Enter a pickup city";
    if (!toCity.trim()) nextErrors.toCity = "Enter a drop city";
    if (!date) nextErrors.date = "Pick a date";
    if (fromCity.trim() && toCity.trim() && fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      nextErrors.toCity = "From and to city can't be the same";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    goToSearch(fromCity, toCity, date);
  };

  const handleSwap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleRouteClick = (route) => {
    setFromCity(route.fromCity);
    setToCity(route.toCity);
    goToSearch(route.fromCity, route.toCity, toDateInputValue());
  };

  return (
    <>
      <HeroSection>
        <HeroGlow aria-hidden="true" />
        <HeroContent>
          <Eyebrow>
            <Search size={13} strokeWidth={2.6} />
            {typedTagline}
            <TypingCaret />
          </Eyebrow>
          <HeroTitle>Ship smarter. Fill every empty mile.</HeroTitle>
          <HeroSubtitle>
            Find spare truck capacity already running your route — or list your own and earn on the
            way back.
          </HeroSubtitle>
        </HeroContent>
      </HeroSection>

      <SearchCardWrap>
        <SearchCard as="form" onSubmit={handleSearch}>
          <Stack $gap={4}>
            <SwapRow>
              <Field label="From city" error={errors.fromCity}>
                <CityAutocomplete placeholder="e.g. Pune" value={fromCity} onChange={setFromCity} autoFocus />
              </Field>
              <SwapButton type="button" onClick={handleSwap} aria-label="Swap cities" title="Swap cities">
                <ArrowLeftRight size={16} strokeWidth={2.4} />
              </SwapButton>
              <Field label="To city" error={errors.toCity}>
                <CityAutocomplete placeholder="e.g. Nashik" value={toCity} onChange={setToCity} />
              </Field>
            </SwapRow>

            <Field label="Date" error={errors.date}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Button type="submit" $size="lg" $fullWidth>
              <Search size={17} strokeWidth={2.4} />
              Search trucks
            </Button>
          </Stack>
        </SearchCard>
      </SearchCardWrap>

      <PageContainer>
        <Section as="div" style={{ paddingTop: 0 }}>
          <SectionHead>
            <SectionEyebrow>Why ShareTruck</SectionEyebrow>
            <SectionTitle>Built for trust, mile after mile</SectionTitle>
            <Muted>Every part of the booking is verified, tracked, paid for safely — and backed up if something goes wrong.</Muted>
          </SectionHead>
          <ValueGrid>
            {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
              <ValueCard key={title}>
                <ValueIcon>
                  <Icon size={20} strokeWidth={2.2} />
                </ValueIcon>
                <ValueTitle>{title}</ValueTitle>
                <Muted>{body}</Muted>
              </ValueCard>
            ))}
          </ValueGrid>
        </Section>
      </PageContainer>

      <Band>
        <BandInner>
          <SectionHead>
            <SectionEyebrow>The process</SectionEyebrow>
            <SectionTitle>How it works</SectionTitle>
            <Muted>From search to delivery in three simple steps.</Muted>
          </SectionHead>
          <StepGrid>
            {STEPS.map((step, i) => (
              <Step key={step.title}>
                <StepNumber>{i + 1}</StepNumber>
                <StepTitle>{step.title}</StepTitle>
                <Muted>{step.body}</Muted>
              </Step>
            ))}
          </StepGrid>
        </BandInner>
      </Band>

      <PageContainer>
        <Section>
          <Stack $gap={3}>
            <div>
              <SectionEyebrow>Trending</SectionEyebrow>
              <SectionTitle>Popular routes</SectionTitle>
            </div>
            {loadingRoutes ? (
              <Row $gap={2}>
                <Spinner />
                <Muted>Loading popular routes…</Muted>
              </Row>
            ) : routes.length === 0 ? (
              <RouteEmptyState>
                <RouteEmptyIcon>
                  <SignpostBig size={20} strokeWidth={2} />
                </RouteEmptyIcon>
                <Muted>No routes posted yet — be the first to search or post a trip.</Muted>
              </RouteEmptyState>
            ) : (
              <RouteGrid>
                {routes.map((route, i) => (
                  <RouteChip
                    key={`${route.fromCity}-${route.toCity}`}
                    type="button"
                    $i={i}
                    onClick={() => handleRouteClick(route)}
                  >
                    <div>
                      <RouteChipCities>
                        {route.fromCity} → {route.toCity}
                      </RouteChipCities>
                      <RouteChipCount>
                        {route.count} {route.count === 1 ? "trip" : "trips"} available
                      </RouteChipCount>
                    </div>
                    <RouteChipArrow size={16} strokeWidth={2.2} />
                  </RouteChip>
                ))}
              </RouteGrid>
            )}
          </Stack>
        </Section>

        <Section>
          <SectionHead>
            <SectionEyebrow>Good to know</SectionEyebrow>
            <SectionTitle>Common questions</SectionTitle>
            <Muted>The short version — full answers in the Help center.</Muted>
          </SectionHead>
          <FaqGrid>
            {HOME_FAQS.map((item) => (
              <FaqCard key={item.id} to={`/help#${item.id}`}>
                <FaqQuestion>{item.question}</FaqQuestion>
                <Muted>{item.answer}</Muted>
              </FaqCard>
            ))}
          </FaqGrid>
        </Section>
      </PageContainer>

      <CtaBanner>
        <CtaInner>
          <CtaTitle>Running a route with spare capacity?</CtaTitle>
          <CtaSubtitle>List your truck in minutes and earn from space you're already paying to move.</CtaSubtitle>
          <Button as={Link} to="/trips/new" $size="lg">
            List your truck
            <ArrowRight size={17} strokeWidth={2.4} />
          </Button>
        </CtaInner>
      </CtaBanner>
    </>
  );
};

export default Home;

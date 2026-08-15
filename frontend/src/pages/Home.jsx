import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeftRight } from "lucide-react";
import { getPopularRoutes } from "../api/trips";
import { PageContainer, Stack, Row, Muted, SectionTitle } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { CityAutocomplete } from "../components/ui/CityAutocomplete";
import { Spinner } from "../components/ui/Spinner";
import { TruckHero } from "../components/TruckHero";
import { fadeInUp } from "../theme/animations";
import { toDateInputValue } from "../utils/format";

const Hero = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.space(6)} 0 ${({ theme }) => theme.space(2)};
  animation: ${fadeInUp} 0.4s ease;
`;

const HeroTitle = styled.h1`
  font-size: 1.9rem;
  font-weight: 800;
  margin: 0 0 8px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 2.4rem;
  }
`;

const HeroSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 15px;
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

const RouteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space(3)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const RouteChip = styled.button`
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

export const Home = () => {
  const navigate = useNavigate();
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(toDateInputValue());
  const [errors, setErrors] = useState({});
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

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
    <PageContainer>
      <TruckHero />

      <Hero>
        <HeroTitle>Where are you shipping?</HeroTitle>
        <HeroSubtitle>Find spare truck capacity already running your route.</HeroSubtitle>
      </Hero>

      <Card as="form" onSubmit={handleSearch}>
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
            Search
          </Button>
        </Stack>
      </Card>

      <Stack $gap={3} style={{ marginTop: 40 }}>
        <SectionTitle>Popular routes</SectionTitle>
        {loadingRoutes ? (
          <Row $gap={2}>
            <Spinner />
            <Muted>Loading popular routes…</Muted>
          </Row>
        ) : routes.length === 0 ? (
          <Muted>No routes posted yet — be the first to search or post a trip.</Muted>
        ) : (
          <RouteGrid>
            {routes.map((route, i) => (
              <RouteChip
                key={`${route.fromCity}-${route.toCity}`}
                type="button"
                $i={i}
                onClick={() => handleRouteClick(route)}
              >
                <RouteChipCities>
                  {route.fromCity} → {route.toCity}
                </RouteChipCities>
                <RouteChipCount>
                  {route.count} {route.count === 1 ? "trip" : "trips"} available
                </RouteChipCount>
              </RouteChip>
            ))}
          </RouteGrid>
        )}
      </Stack>
    </PageContainer>
  );
};

export default Home;

import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  ArrowLeftRight,
  ArrowRight,
  Clock3,
  FileCheck,
  Gift,
  IndianRupee,
  LifeBuoy,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  SignpostBig,
  Truck,
  XCircle,
} from "lucide-react";
import heroTruckPhotoSrc from "../assets/hero-truck-photo.jpg";
import roadTruckSrc from "../assets/road-truck.png";
import { getPopularRoutes } from "../api/trips";
import { PageContainer, Stack, Row, Muted, Body, SectionTitle } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { Spinner } from "../components/ui/Spinner";
import { Accordion, AccordionItem } from "../components/ui/Accordion";
import { fadeInUp, blink, pulseSoft } from "../theme/animations";
import { toDateTimeInputValue } from "../utils/format";
import { usePageMeta } from "../hooks/usePageMeta";
import { useUnitAmount } from "../hooks/useUnitAmount";
import { useBranding } from "../context/BrandingContext";
import { FAQ_CATEGORIES } from "../content/faq";

const HeroSection = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.45) 0%, ${({ theme }) => theme.color.bg} 62%);
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const HeroGlow = styled.div`
  position: absolute;
  top: -20%;
  left: -10%;
  width: 560px;
  height: 420px;
  max-width: 80vw;
  background: radial-gradient(circle, ${({ theme }) => theme.color.accentSoft} 0%, transparent 70%);
  pointer-events: none;
`;

const HeroInner = styled.div`
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(16)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(18)};
  }
`;

const HeroGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.space(7)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: 1fr 1fr;
    gap: ${({ theme }) => theme.space(5)};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: 0.95fr 1.15fr;
    gap: ${({ theme }) => theme.space(7)};
  }
`;

const HeroLeft = styled.div`
  position: relative;
  z-index: 1;
  animation: ${fadeInUp} 0.5s ease both;
`;

const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success};
  flex-shrink: 0;
  animation: ${pulseSoft} 1.8s ease-in-out infinite;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  margin-bottom: ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.successSoft};
  border: 1px solid rgba(22, 163, 74, 0.22);
  color: ${({ theme }) => theme.color.success};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const TypingCaret = styled.span`
  display: inline-block;
  width: 2px;
  height: 10px;
  margin-left: 1px;
  background: currentColor;
  vertical-align: -1px;
  animation: ${blink} 0.85s step-end infinite;
`;

const TAGLINE = "Now live across India";

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
  max-width: 560px;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin: 0 0 12px;
  line-height: 1.16;
  color: ${({ theme }) => theme.color.text};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 2.35rem;
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    font-size: 2.6rem;
  }
`;

const AccentText = styled.span`
  color: ${({ theme }) => theme.color.accent};
`;

const HeroSubtitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.space(5)};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 15.5px;
  line-height: 1.6;
  max-width: 520px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 17px;
  }
`;

const TrustRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space(3)};

  @media (max-width: 539px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.space(3)};
  }
`;

const TrustItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
`;

const TrustIconWrap = styled.div`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  transition: border-color ${({ theme }) => theme.motion.fast} ease, transform ${({ theme }) => theme.motion.fast} ease;

  ${TrustItem}:hover & {
    border-color: ${({ theme }) => theme.color.accent};
    transform: translateY(-1px);
  }
`;

const TrustTitle = styled.div`
  font-weight: 700;
  font-size: 13px;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 2px;
  line-height: 1.3;
`;

const TrustBody = styled.div`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.textMuted};
`;

const heroImageIn = keyframes`
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
`;

const HeroRight = styled.div`
  position: relative;
  z-index: 1;
`;

// No card framing (no border-radius/border/overflow-clip) — the photo is
// meant to read as part of the hero environment, not a bounded image tile.
// A fixed height + object-fit:cover (rather than the natural width:100%/
// height:auto aspect ratio) is what makes "significantly larger, bleeding
// toward the bottom" possible at all: this source photo is a wide 16:9-ish
// frame, and scaling it to fill a tall box while keeping full width would
// need the column to be nearly the whole hero — cover crops the excess sky/
// road instead, anchored (see TruckImage's object-position) to keep the
// cab and trailer fully in frame.
const TruckImageFrame = styled.div`
  position: relative;
  height: 200px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    height: 320px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    height: 400px;
    margin-bottom: -40px;
  }

  @media (min-width: 1280px) {
    height: 440px;
    margin-bottom: -44px;
  }
`;

const TruckImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 55%;
  animation: ${heroImageIn} 0.7s ${({ theme }) => theme.motion.easing} both;
`;

// The source photo is already flattened onto white with soft, organic
// edges (see assets/hero-truck-photo.jpg's own fade), but object-fit:cover
// crops into that baked-in fade at most viewport widths — these two
// overlays are the reliable mechanism now, re-creating the same "merges
// into the page" effect at a fixed, controlled percentage of whatever the
// rendered box turns out to be.
const TruckImageFadeLeft = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.bg} 0%,
    rgba(255, 255, 255, 0.55) 10%,
    rgba(255, 255, 255, 0) 30%
  );
  pointer-events: none;
`;

const TruckImageFadeBottom = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 78%, ${({ theme }) => theme.color.bg} 100%);
  pointer-events: none;
`;

const RouteViz = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
    position: absolute;
    top: 8%;
    left: 4%;
    right: 6%;
    height: 40%;
    pointer-events: none;
  }
`;

const RoutePath = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const RoutePin = styled.div`
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 5px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.card};
  color: ${({ theme }) => theme.color.text};
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
`;

const RouteFrom = styled(RoutePin)`
  top: 60%;
  left: -2%;
`;

const RouteTo = styled(RoutePin)`
  top: 0;
  right: -2%;
`;

const SearchCardWrap = styled.div`
  position: relative;
  max-width: 1220px;
  margin: -32px auto 0;
  padding: 0 ${({ theme }) => theme.space(4)};
  z-index: 2;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    margin-top: -40px;
    padding: 0 ${({ theme }) => theme.space(6)};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    margin-top: -48px;
  }
`;

// Descendant selectors (rather than editing components/ui/Form.jsx, which
// every form in the app shares) so this one card gets its own more premium
// field treatment — taller, lighter, bigger focus glow — without touching
// how an input looks anywhere else.
const SearchCard = styled(Card)`
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.raised};
  animation: ${fadeInUp} 0.5s ease 0.15s both;
  padding: ${({ theme }) => theme.space(5)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(6)};
  }

  input,
  select {
    background: #fafbfc !important;
    height: 54px;
    border-radius: 13px !important;
  }

  input:focus,
  select:focus {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.color.accentSoft} !important;
  }
`;

const SwapRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: ${({ theme }) => theme.space(2)};
`;

const SearchFieldsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(2)};
  align-items: end;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: 1.3fr 1fr auto;
    gap: ${({ theme }) => theme.space(3)};
  }
`;

// Field's own label pushes its input down ~21px — this empty spacer keeps
// the submit button visually bottom-aligned with the From/To/Date inputs
// in the same row, without the button needing (and rendering) a label of
// its own.
const ButtonRowSpacer = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
    height: 27px;
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

const TrustStripWrap = styled.div`
  max-width: 1220px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)} 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(6)} 0;
  }
`;

const TrustStripBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  row-gap: ${({ theme }) => theme.space(3)};
  column-gap: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(5)};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.card};
  animation: ${fadeInUp} 0.5s ease 0.25s both;
`;

const TrustStripItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  white-space: nowrap;

  svg {
    color: ${({ theme }) => theme.color.accent};
    flex-shrink: 0;
  }
`;

const TrustStripDivider = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) => theme.color.border};
  flex-shrink: 0;

  @media (max-width: 767px) {
    display: none;
  }
`;

const Section = styled.section`
  padding-top: ${({ theme }) => theme.space(12)};
`;

const SectionHead = styled(Stack).attrs({ $gap: 2 })`
  text-align: center;
  max-width: 480px;
  margin: 0 auto ${({ theme }) => theme.space(10)};
`;

const SectionEyebrow = styled.span`
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: 2px;
`;

// Both in-scope sections (Why Truckgee, How it works) want a noticeably
// bigger header than SectionTitle/Muted's app-wide default (used as-is by
// Popular Routes/FAQ below, which this redesign doesn't touch) — local
// overrides here instead of resizing those shared components everywhere.
const SectionHeading = styled(SectionTitle)`
  font-size: 1.75rem;
  line-height: 1.2;
  letter-spacing: -0.01em;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 2.2rem;
  }
`;

const SectionLede = styled(Muted)`
  font-size: 15.5px;
  line-height: 1.55;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 17px;
  }
`;

const ValueGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(5)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ValueCard = styled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 260px;
  padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(5)};
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.card};
  transition: transform ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing},
    box-shadow ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing},
    border-color ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing};
  animation: ${fadeInUp} 0.5s ease both;
  animation-delay: ${({ $i = 0 }) => $i * 0.08}s;

  // Very subtle decorative dot grid, bottom-right — a real element (not
  // ::after) so it can sit at z-index:0 without fighting a pseudo-element's
  // own stacking quirks, while the actual content below stays plain static
  // flow and so always paints above it.
  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.color.accent};
    box-shadow: ${({ theme }) => theme.shadow.raised};
  }
`;

const ValueCardDots = styled.div`
  position: absolute;
  z-index: 0;
  right: -8px;
  bottom: -8px;
  width: 88px;
  height: 88px;
  background-image: radial-gradient(circle, ${({ theme }) => theme.color.accent} 1.4px, transparent 1.4px);
  background-size: 13px 13px;
  opacity: 0.14;
  pointer-events: none;
`;

const ValueIcon = styled.div`
  position: relative;
  z-index: 1;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: ${({ theme }) => theme.space(4)};
  transition: background ${({ theme }) => theme.motion.slow} ease;

  ${ValueCard}:hover & {
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.onAccent};
  }
`;

const ValueTitle = styled.div`
  position: relative;
  z-index: 1;
  font-weight: 700;
  font-size: 17px;
  margin-bottom: 7px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

const ValueBody = styled(Muted)`
  position: relative;
  z-index: 1;
  font-size: 14.5px;
  line-height: 1.5;
`;

// Background is theme.color.accentSoft laid flat over white — the same
// token the accent-tinted icon fills already use elsewhere, just at full
// section scale, rather than a new hardcoded "light blue" color.
const Band = styled.section`
  position: relative;
  overflow: hidden;
  margin-top: ${({ theme }) => theme.space(16)};
  background: ${({ theme }) => theme.color.accentSoft};
  padding: ${({ theme }) => theme.space(16)} ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(20)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(20)} ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(24)};
  }
`;

// A soft curved "road" + waypoint pin along the very bottom of the process
// section — decorative only, echoes the hero's route-line motif so the two
// sections read as one visual system instead of two unrelated ideas.
const BandRoadDecoration = styled.svg`
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  width: 100%;
  height: 90px;
  pointer-events: none;
  opacity: 0.5;
`;

// Same 'd' the visible <path> below draws — sharing one string keeps the
// truck glued to the curve at every viewport width, since offset-path and
// the <path> it mirrors both resolve in this SVG's own viewBox coordinate
// system (preserveAspectRatio="none" on the parent makes that stretch
// uniform for both, so they never drift apart).
const ROAD_PATH_D = "M -10 70 C 250 20, 550 100, 850 45 S 1150 10, 1210 40";

const driveRoad = keyframes`
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
`;

// The callback from "our old site had a driving-truck animation" — revived
// here rather than in the hero (kept untouched), riding the road decoration
// this section already draws. A plain CSS animation (not SMIL) so it's
// automatically covered by GlobalStyle's prefers-reduced-motion rule, same
// as every other animation in this file.
const RoadTruck = styled.g`
  offset-path: path("${ROAD_PATH_D}");
  offset-rotate: auto;
  animation: ${driveRoad} 22s linear infinite;
`;

// road-truck.png is 400x266 (≈1.5:1) — height picked to match the previous
// lucide Truck icon's on-road footprint, width follows the source's own
// aspect ratio so the illustration isn't stretched.
const ROAD_TRUCK_HEIGHT = 30;
const ROAD_TRUCK_WIDTH = Math.round(ROAD_TRUCK_HEIGHT * (400 / 266));

const BandInner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
`;

const ProcessGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(11)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.space(11)} ${({ theme }) => theme.space(5)};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${({ theme }) => theme.space(6)};
  }
`;

// The horizontal dashed line linking all three step numbers — desktop only
// (below that, steps stack and the connector would need a different, per-
// pair vertical geometry; see ProcessStepWrap's own ::before for that case).
// Positioned behind the circles (z-index below ProcessNumber's).
const ProcessConnector = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: block;
    position: absolute;
    top: 23px;
    left: 16.6%;
    right: 16.6%;
    border-top: 2px dashed ${({ theme }) => theme.color.accent};
    opacity: 0.3;
    z-index: 0;
  }
`;

const ProcessStepWrap = styled.div`
  position: relative;
  padding-top: 24px;
  animation: ${fadeInUp} 0.5s ease both;
  animation-delay: ${({ $i = 0 }) => 0.15 + $i * 0.12}s;

  // Vertical connector between stacked steps — only where the grid is
  // guaranteed single-column (below tablet); tablet's 2-up and desktop's
  // 3-up both use ProcessConnector's horizontal line instead.
  @media (max-width: 767px) {
    &:not(:last-child)::before {
      content: "";
      position: absolute;
      top: 47px;
      left: 24px;
      width: 0;
      height: calc(100% + ${({ theme }) => theme.space(11)} - 24px);
      border-left: 2px dashed ${({ theme }) => theme.color.accent};
      opacity: 0.3;
      z-index: 0;
    }
  }
`;

const ProcessNumber = styled.div`
  position: relative;
  z-index: 2;
  width: 46px;
  height: 46px;
  margin-bottom: -23px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.onAccent};
  border: 4px solid ${({ theme }) => theme.color.accentSoft};
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.02em;
  animation: ${fadeInUp} 0.4s ease both;
`;

const ProcessCard = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(5)};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 20px;
  box-shadow: ${({ theme }) => theme.shadow.card};
  transition: transform ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing},
    box-shadow ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing};

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadow.raised};
  }
`;

const ProcessCardIcon = styled.div`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accent};
`;

const ProcessCardTitle = styled.div`
  font-weight: 700;
  font-size: 16.5px;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.color.text};
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

// Frameless card wrapping the reused Accordion (Help.jsx renders the same
// component full-width on its own page) — the border/radius/shadow here is
// what makes this read as a distinct "FAQ panel" on the home page rather
// than a bare list floating in the section.
const FaqPanel = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.space(6)};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 20px;
  box-shadow: ${({ theme }) => theme.shadow.card};

  // Accordion renders its own top border — redundant against this panel's
  // own border directly above it.
  ${Accordion} {
    border-top: none;
  }
`;

const FaqMoreLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  margin: ${({ theme }) => theme.space(6)} auto 0;
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.color.accent};

  &:hover {
    text-decoration: underline;
  }
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

// The single-line strip directly under the search card — distinct from
// both HERO_TRUST_ITEMS (icon + title + body, inside the hero text column)
// and VALUE_PROPS (the full below-hero section) — this one's just an icon
// and a label, read at a glance while the eye is still on the search card.
const TRUST_STRIP_ITEMS = [
  { icon: ShieldCheck, label: "Verified Trucks & Users" },
  { icon: Clock3, label: "On-time Deliveries" },
  { icon: XCircle, label: "Free Cancellation" },
  { icon: LifeBuoy, label: "24/7 Support" },
];

// The hero's compact 3-item trust row — a tighter, glance-only subset of
// VALUE_PROPS below (which gets its own full section with more room for
// body copy). Kept separate rather than slicing VALUE_PROPS so each can
// word its copy for its own space constraints.
const HERO_TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Verified & Trusted",
    body: "Every booking is verified and secure.",
  },
  {
    icon: MapPin,
    title: "Booking status, live",
    body: "Follow pickup to drop-off, every step.",
  },
  {
    icon: IndianRupee,
    title: "Free & Transparent",
    body: "Zero hidden charges — what you agree is what you pay.",
  },
];

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Verified transporters",
    body: "Every transporter is ID-verified before they can list spare capacity.",
  },
  {
    icon: MapPin,
    title: "Booking status, every step",
    body: "Follow your booking from confirmed to picked up to delivered.",
  },
  {
    icon: Gift,
    title: "100% free — no commission",
    body: "No platform fee, no listing fee, no hidden cut. Agree a price directly and keep every rupee of it.",
  },
  {
    icon: Scale,
    title: "Backed by real support",
    body: "If something goes wrong, raise it straight from the booking — our team steps in to resolve it.",
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Search your route",
    body: "Tell us where and when — we'll show trucks already heading that way.",
  },
  {
    icon: FileCheck,
    title: "Compare & book",
    body: "Pick a truck by price, capacity and transporter rating, then book in minutes.",
  },
  {
    icon: Truck,
    title: "Ship with tracking",
    body: "Follow your shipment live, then settle up directly with the other party — no fees, no middleman.",
  },
];

// The highest-value questions for a first-time visitor deciding whether to
// trust the platform — pulled from the same data Help.jsx renders in full
// (frontend/src/content/faq.js), so the answers can't drift out of sync
// between the two pages.
const HOME_FAQ_IDS = [
  "how-to-book",
  "commission",
  "kyc-verification",
  "cancellations",
  "disputes",
  "shipper-and-transporter",
];
const ALL_FAQ_ITEMS = FAQ_CATEGORIES.flatMap((cat) => cat.items);
const HOME_FAQS = HOME_FAQ_IDS.map((id) => ALL_FAQ_ITEMS.find((item) => item.id === id)).filter(Boolean);

export const Home = () => {
  const navigate = useNavigate();
  const { platformName } = useBranding();
  usePageMeta({
    description: `${platformName} — ship for less, earn from empty space. Discover spare truck capacity on routes across India, matched by route, zero commission — 100% free to use.`,
  });
  // The input shows a full address (Uber/Rapido-style autocomplete, see
  // LocationAutocomplete), but trip search still matches by exact city —
  // fromCityResolved/toCityResolved track the city extracted from whichever
  // suggestion was picked. If the user just types a city name and searches
  // without picking a suggestion, resolved stays empty and handleSearch
  // falls back to the typed text itself, same as the old city-only field.
  const [fromPoint, setFromPoint] = useState({ address: "", lat: null, lng: null });
  const [toPoint, setToPoint] = useState({ address: "", lat: null, lng: null });
  const [fromCityResolved, setFromCityResolved] = useState("");
  const [toCityResolved, setToCityResolved] = useState("");
  const [departureAt, setDepartureAt] = useState(toDateTimeInputValue());
  const capacityAmount = useUnitAmount();
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

  // Search still matches trips by date only (±1 day window) — the time
  // component is captured so a shipper can note when they need pickup, but
  // isn't sent as a filter. capacityTons carries through as `minCapacity`,
  // which SearchResults already reads to pre-fill its own capacity filter.
  const goToSearch = (from, to, whenDateTime, capacityTons) => {
    const params = new URLSearchParams({
      fromCity: from.trim(),
      toCity: to.trim(),
      date: whenDateTime.slice(0, 10),
    });
    if (capacityTons) params.set("minCapacity", capacityTons);
    navigate(`/search?${params}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const fromCity = (fromCityResolved || fromPoint.address).trim();
    const toCity = (toCityResolved || toPoint.address).trim();
    const nextErrors = {};
    if (!fromCity) nextErrors.fromCity = "Enter a pickup location";
    if (!toCity) nextErrors.toCity = "Enter a drop location";
    if (!departureAt) nextErrors.departureAt = "Pick a date and time";
    if (fromCity && toCity && fromCity.toLowerCase() === toCity.toLowerCase()) {
      nextErrors.toCity = "From and to city can't be the same";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    goToSearch(fromCity, toCity, departureAt, capacityAmount.tons);
  };

  const handleSwap = () => {
    setFromPoint(toPoint);
    setToPoint(fromPoint);
    setFromCityResolved(toCityResolved);
    setToCityResolved(fromCityResolved);
  };

  // Typing after having picked a suggestion invalidates that pick's resolved
  // city — clear it so a stale city from an earlier selection can't outlive
  // what's actually in the box. When this fires from selectSuggestion,
  // onResolve immediately follows in the same event and sets the fresh
  // city, so the clear here never "wins" for an actual pick.
  const handleFromChange = (point) => {
    setFromPoint(point);
    setFromCityResolved("");
  };

  const handleToChange = (point) => {
    setToPoint(point);
    setToCityResolved("");
  };

  const handleRouteClick = (route) => {
    setFromPoint({ address: route.fromCity, lat: null, lng: null });
    setToPoint({ address: route.toCity, lat: null, lng: null });
    setFromCityResolved(route.fromCity);
    setToCityResolved(route.toCity);
    goToSearch(route.fromCity, route.toCity, toDateTimeInputValue(), capacityAmount.tons);
  };

  return (
    <>
      <HeroSection>
        <HeroGlow aria-hidden="true" />
        <HeroInner>
          <HeroGrid>
            <HeroLeft>
              <Eyebrow>
                <LiveDot aria-hidden="true" />
                {typedTagline}
                <TypingCaret />
                <span role="img" aria-label="India flag">
                  🇮🇳
                </span>
              </Eyebrow>
              <HeroTitle>
                Ship for less.
                <br />
                Earn from <AccentText>empty space.</AccentText>
              </HeroTitle>
              <HeroSubtitle>
                Discover spare capacity on routes already running, get matched by route, and book only
                the part-load space your shipment actually needs.
              </HeroSubtitle>

              <TrustRow>
                {HERO_TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
                  <TrustItem key={title}>
                    <TrustIconWrap>
                      <Icon size={16} strokeWidth={2.2} />
                    </TrustIconWrap>
                    <div>
                      <TrustTitle>{title}</TrustTitle>
                      <TrustBody>{body}</TrustBody>
                    </div>
                  </TrustItem>
                ))}
              </TrustRow>
            </HeroLeft>

            <HeroRight>
              <TruckImageFrame>
                <TruckImage src={heroTruckPhotoSrc} alt="Truckgee cargo truck on the highway" />
                <TruckImageFadeLeft aria-hidden="true" />
                <TruckImageFadeBottom aria-hidden="true" />
                <RouteViz aria-hidden="true">
                  {/* viewBox proportioned to roughly match RouteViz's own
                      rendered aspect ratio (wide, ~2.7:1) — a square 100x100
                      viewBox stretched with preserveAspectRatio="none" onto
                      a wide box distorts stroke-width/dasharray/circles
                      unevenly (dashes read as blobs, circles as ovals). */}
                  <RoutePath viewBox="0 0 280 100" preserveAspectRatio="none">
                    <path
                      d="M 14 80 Q 145 30 266 14"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.6"
                      strokeDasharray="1 8"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    <circle cx="140" cy="38" r="2.6" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1" />
                  </RoutePath>
                  <RouteFrom>
                    <MapPin size={12} strokeWidth={2.4} color="#1d4ed8" />
                    Mumbai
                  </RouteFrom>
                  <RouteTo>
                    <MapPin size={12} strokeWidth={2.4} color="#1d4ed8" />
                    Delhi
                  </RouteTo>
                </RouteViz>
              </TruckImageFrame>
            </HeroRight>
          </HeroGrid>
        </HeroInner>
      </HeroSection>

      <SearchCardWrap>
        <SearchCard as="form" onSubmit={handleSearch}>
          <Stack $gap={4}>
            <SwapRow>
              <Field label="From" error={errors.fromCity}>
                <LocationAutocomplete
                  placeholder="Pickup address or area"
                  value={fromPoint}
                  onChange={handleFromChange}
                  onResolve={setFromCityResolved}
                  showPreview={false}
                  autoFocus
                />
              </Field>
              <SwapButton type="button" onClick={handleSwap} aria-label="Swap locations" title="Swap locations">
                <ArrowLeftRight size={16} strokeWidth={2.4} />
              </SwapButton>
              <Field label="To" error={errors.toCity}>
                <LocationAutocomplete
                  placeholder="Drop address or area"
                  value={toPoint}
                  onChange={handleToChange}
                  onResolve={setToCityResolved}
                  showPreview={false}
                />
              </Field>
            </SwapRow>

            <SearchFieldsRow>
              <Field label="Date & time" error={errors.departureAt}>
                <Input
                  type="datetime-local"
                  value={departureAt}
                  onChange={(e) => setDepartureAt(e.target.value)}
                />
              </Field>
              <Field label="Capacity needed (optional)">
                <UnitAmountInput
                  value={capacityAmount.displayValue}
                  unit={capacityAmount.unit}
                  onValueChange={capacityAmount.onValueChange}
                  onUnitChange={capacityAmount.onUnitChange}
                  placeholder="e.g. 5"
                />
              </Field>
              <div>
                <ButtonRowSpacer aria-hidden="true" />
                <Button type="submit" $size="lg" $fullWidth>
                  <Search size={17} strokeWidth={2.4} />
                  Search trucks
                </Button>
              </div>
            </SearchFieldsRow>
          </Stack>
        </SearchCard>
      </SearchCardWrap>

      <TrustStripWrap>
        <TrustStripBar>
          {TRUST_STRIP_ITEMS.map(({ icon: Icon, label }, i) => (
            <Fragment key={label}>
              {i > 0 && <TrustStripDivider aria-hidden="true" />}
              <TrustStripItem>
                <Icon size={15} strokeWidth={2.2} />
                {label}
              </TrustStripItem>
            </Fragment>
          ))}
        </TrustStripBar>
      </TrustStripWrap>

      <PageContainer>
        <Section as="div" style={{ paddingTop: 0 }}>
          <SectionHead style={{ maxWidth: 620 }}>
            <SectionEyebrow>Why {platformName}</SectionEyebrow>
            <SectionHeading>Built for trust, mile after mile</SectionHeading>
            <SectionLede>
              Every part of the booking is verified, tracked, and free of charge — and backed up if
              something goes wrong.
            </SectionLede>
          </SectionHead>
          <ValueGrid>
            {VALUE_PROPS.map(({ icon: Icon, title, body }, i) => (
              <ValueCard key={title} $i={i}>
                <ValueCardDots aria-hidden="true" />
                <ValueIcon>
                  <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
                </ValueIcon>
                <ValueTitle>{title}</ValueTitle>
                <ValueBody>{body}</ValueBody>
              </ValueCard>
            ))}
          </ValueGrid>
        </Section>
      </PageContainer>

      <Band>
        <BandInner>
          <SectionHead style={{ maxWidth: 620 }}>
            <SectionEyebrow>The process</SectionEyebrow>
            <SectionHeading>How it works</SectionHeading>
            <SectionLede>From search to delivery in three simple steps.</SectionLede>
          </SectionHead>
          <ProcessGrid>
            <ProcessConnector aria-hidden="true" />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <ProcessStepWrap key={title} $i={i}>
                <ProcessNumber>{String(i + 1).padStart(2, "0")}</ProcessNumber>
                <ProcessCard>
                  <ProcessCardIcon>
                    <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
                  </ProcessCardIcon>
                  <div>
                    <ProcessCardTitle>{title}</ProcessCardTitle>
                    <Muted>{body}</Muted>
                  </div>
                </ProcessCard>
              </ProcessStepWrap>
            ))}
          </ProcessGrid>
        </BandInner>
        <BandRoadDecoration aria-hidden="true" viewBox="0 0 1200 90" preserveAspectRatio="none">
          <path
            d={ROAD_PATH_D}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth="2"
            strokeDasharray="1 10"
            strokeLinecap="round"
          />
          <circle cx="1000" cy="30" r="4" fill="#1d4ed8" opacity="0.5" />
          <RoadTruck>
            <image
              href={roadTruckSrc}
              x={-ROAD_TRUCK_WIDTH / 2}
              y={-ROAD_TRUCK_HEIGHT / 2}
              width={ROAD_TRUCK_WIDTH}
              height={ROAD_TRUCK_HEIGHT}
            />
          </RoadTruck>
        </BandRoadDecoration>
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
            <SectionTitle>Frequently asked questions</SectionTitle>
            <Muted>Everything you need to know before your first booking.</Muted>
          </SectionHead>
          <FaqPanel>
            <Accordion>
              {HOME_FAQS.map((item) => (
                <AccordionItem key={item.id} id={`home-${item.id}`} question={item.question}>
                  <Body>{item.answer}</Body>
                </AccordionItem>
              ))}
            </Accordion>
          </FaqPanel>
          <FaqMoreLink to="/help">
            See all questions in the Help center
            <ArrowRight size={15} strokeWidth={2.4} />
          </FaqMoreLink>
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

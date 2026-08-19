import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { keyframes, useTheme } from "styled-components";
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gift,
  Headphones,
  IndianRupee,
  MapPin,
  Package,
  Search,
  Send,
  ShieldCheck,
  SignpostBig,
  Truck,
} from "lucide-react";
import heroTruckPhotoSrc from "../assets/hero-truck-photo.jpg";
import verifiedTruckSrc from "../assets/verified-truck.png";
import truckRunnerSrc from "../assets/truck-runner.png";
import { getPopularRoutes } from "../api/trips";
import { PageContainer, Stack, Row, Muted, Body, SectionTitle } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Label } from "../components/ui/Form";
import { LocationAutocomplete } from "../components/ui/LocationAutocomplete";
import { UnitAmountInput } from "../components/ui/UnitAmountInput";
import { Spinner } from "../components/ui/Spinner";
import { Accordion, AccordionItem } from "../components/ui/Accordion";
import { fadeInUp } from "../theme/animations";
import { toDateInputValue } from "../utils/format";
import { usePageMeta } from "../hooks/usePageMeta";
import { WebsiteSchema } from "../components/WebsiteSchema";
import { useUnitAmount } from "../hooks/useUnitAmount";
import { useMediaQuery } from "../hooks/useMediaQuery";
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

// Bottom padding has to clear both the taller hero content this redesign
// added (badge + big heading + trust row) AND the search card's own
// negative-margin overlap (SearchCardWrap) plus the running-truck strip
// riding its top border — too little here and the truck strip visually
// collides with the trust row above it instead of sitting in clear space.
const HeroInner = styled.div`
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(26)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(28)};
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

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  margin-bottom: ${({ theme }) => theme.space(4)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.card};
  color: ${({ theme }) => theme.color.navy};
  font-size: 13px;
  font-weight: 600;
  animation: ${fadeInUp} 0.5s ease both;
`;

const HeroTitle = styled.h1`
  max-width: 560px;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin: 0 0 14px;
  line-height: 1.12;
  color: ${({ theme }) => theme.color.navy};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 2.75rem;
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    font-size: 4.1rem;
  }
`;

const AccentText = styled.span`
  color: ${({ theme }) => theme.color.orange};
`;

const HeroDivider = styled.div`
  width: 46px;
  height: 4px;
  border-radius: ${({ theme }) => theme.radius.pill};
  margin-bottom: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.color.orange};
`;

const HeroSubtitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.space(6)};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 15.5px;
  line-height: 1.6;
  max-width: 480px;

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
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.lightBlue};
  color: ${({ theme }) => theme.color.accent};
  transition: transform ${({ theme }) => theme.motion.fast} ease;

  ${TrustItem}:hover & {
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
  height: 220px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    height: 340px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    height: 440px;
    margin-bottom: -40px;
  }

  @media (min-width: 1280px) {
    height: 480px;
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

// Both markers sit along the image's right edge (destination up top, origin
// down near the search card) with a curved dashed line joining them,
// matching the reference's vertical route rather than the old horizontal
// left-to-right layout.
const RouteViz = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
    position: absolute;
    inset: 0;
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

// Plain icon + label directly on the image (no pill/card chrome) — the
// reference reads these as annotations on the photo itself, not floating
// UI elements.
const RoutePin = styled.div`
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.color.navy};
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9), 0 1px 8px rgba(255, 255, 255, 0.7);
  white-space: nowrap;
`;

const RouteTo = styled(RoutePin)`
  top: 6%;
  right: 3%;
`;

const RouteFrom = styled(RoutePin)`
  bottom: 4%;
  right: 1%;
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
  position: relative;
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

const SearchCardHeader = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(5)};
`;

const SearchCardTitle = styled.h2`
  margin: 0 0 3px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.navy};
`;

const SearchCardSubtitle = styled.p`
  margin: 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const ShareCapacityLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

const driveAcross = keyframes`
  from { left: -54px; }
  to { left: calc(100% + 54px); }
`;

// Sits directly above SearchCard's top border — bottom:100% against the
// card (now position:relative) puts this strip's own bottom edge exactly on
// the card's border line, extending upward from there, so the truck rides
// above the line rather than being clipped inside it. left:0/right:0 match
// the card's own width so overflow:hidden here only ever clips the truck
// horizontally as it enters/exits at the edges (for a seamless loop) — it
// never constrains SearchCard itself, so the LocationAutocomplete dropdowns
// further down the card still overflow past it exactly as before.
const TopBorderTrack = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 26px;
  overflow: hidden;
  pointer-events: none;
`;

// left (not transform) so the travel distance is always the track's full
// width regardless of viewport — calc(100% + Xpx) carries the truck fully
// past both edges before it loops, so the jump-cut reset happens while it's
// already offscreen and invisible. The source art's cab faces right, so
// left-to-right motion reads as driving forward, not backing up. Bottom-
// anchored (not vertically centered) so the wheels sit right on the card's
// border line, like the truck is driving along the top edge.
const RunningTruck = styled.img`
  position: absolute;
  bottom: 1px;
  left: -54px;
  width: 46px;
  height: auto;
  animation: ${driveAcross} 26s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    left: 10px;
  }
`;

const SwapRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: ${({ theme }) => theme.space(1)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    gap: ${({ theme }) => theme.space(2)};
  }
`;

// align-items:start (not end) deliberately — Field's FieldGroup carries its
// own margin-bottom (for normal vertical form stacking), which inflates
// this row's own computed height beyond any single cell's visible content.
// With align-items:end that extra margin silently ate into the alignment
// itself: the two real Fields sat flush at the row's top as always, but the
// button column (no such margin) got pulled all the way down to the row's
// true bottom, landing visibly below the inputs instead of even with them.
// Top-aligning everything sidesteps that entirely — margin-bottom trailing
// off the bottom of a cell never affects where its top-edge content sits.
const SearchFieldsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(2)};
  align-items: start;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: 1.3fr 1fr auto;
    gap: ${({ theme }) => theme.space(3)};
  }

  // Field's own margin-bottom is for stacking fields vertically in a plain
  // form — meaningless (and, per above, actively misleading) as a grid
  // cell here, where SearchCard's own Stack $gap handles spacing between
  // this row and whatever comes after it instead.
  > * {
    margin-bottom: 0;
  }
`;

// A real (invisible) Field label, not a hand-measured pixel spacer — sizes
// itself identically to the From/Date/Capacity labels beside it by
// construction, so it can't quietly drift out of sync if Label's own
// font-size/line-height ever changes. margin-bottom:6px reproduces
// FieldGroup's own `gap: 6px` between label and control — this sits in a
// plain block div, not that flex column, so the gap needs restating here.
const ButtonLabelSpacer = styled(Label)`
  display: none;
  visibility: hidden;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
    margin-bottom: 6px;
  }
`;

// SearchCard already forces input/select to a shared 54px height (its own
// premium field treatment) — Button's "lg" size is padding-driven and
// renders shorter, so without this it's visibly out of step with the
// fields beside it even once top-alignment is fixed.
const SearchSubmitButton = styled(Button)`
  height: 54px;
`;

const SwapButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  margin-bottom: 10px;
  border-radius: 50%;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    width: 40px;
    height: 40px;
    margin-bottom: 6px;
  }
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

// Embedded in the bottom of SearchCard itself (client reference shows the
// trust strip as part of the same card, not a separate section below it) —
// a top divider is enough separation from the form; no card-in-card
// border/shadow/background of its own.
const CardTrustStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  row-gap: ${({ theme }) => theme.space(3)};
  column-gap: ${({ theme }) => theme.space(6)};
  margin-top: ${({ theme }) => theme.space(5)};
  padding-top: ${({ theme }) => theme.space(5)};
  border-top: 1px solid ${({ theme }) => theme.color.border};
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

// ===== "Why TruckGee" — client-spec redesign =====
// Locally scoped to this one section (none of these are exported or reused
// elsewhere), so they're deliberately their own thing rather than resized
// variants of the app-wide SectionEyebrow/SectionHeading/SectionLede —
// those stay untouched for Trending/FAQ below.
const WhySectionHead = styled(Stack).attrs({ $gap: 3 })`
  text-align: center;
  max-width: 800px;
  margin: 0 auto ${({ theme }) => theme.space(13)};
`;

const WhyEyebrow = styled.span`
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accent};
`;

const WhyHeading = styled.h2`
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.12;
  color: ${({ theme }) => theme.color.text};
  font-size: 2.1rem;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 3.25rem;
  }
`;

const WhyLede = styled.p`
  margin: 0 auto;
  max-width: 720px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 16.5px;
  line-height: 1.6;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    font-size: 19px;
  }
`;

const WhyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(6)};
  max-width: 1180px;
  margin: 0 auto;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${({ theme }) => theme.space(7)};
  }
`;

// border-bottom doubles as the reference design's subtle blue accent line —
// no extra pseudo-element needed for it.
const WhyCard = styled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: 3px solid ${({ theme }) => theme.color.accent};
  border-radius: 20px;
  box-shadow: ${({ theme }) => theme.shadow.card};
  transition: transform ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing},
    box-shadow ${({ theme }) => theme.motion.slow} ${({ theme }) => theme.motion.easing};
  animation: ${fadeInUp} 0.5s ease both;
  animation-delay: ${({ $i = 0 }) => $i * 0.08}s;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    min-height: 480px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadow.raised};
  }
`;

const WhyCardTop = styled.div`
  padding: ${({ theme }) => theme.space(7)} ${({ theme }) => theme.space(6)} 0;
`;

const WhyCardIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 15px;
  background: ${({ theme }) => theme.color.lightBlue};
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

const WhyCardTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

const WhyCardBody = styled.p`
  margin: 0;
  max-width: 30ch;
  font-size: 16px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textMuted};
  white-space: pre-line;
`;

const WhyCardIllustration = styled.div`
  position: relative;
  flex: 1;
  min-height: 160px;
  margin-top: ${({ theme }) => theme.space(5)};
`;

// ----- Shared skyline motif (cards 1 and 3) -----
// One small SVG reused by both illustrations rather than two near-identical
// ones, so the "family" the brief asks for is structural, not just color.
const Skyline = ({ tint }) => (
  <svg
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
    style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 56, opacity: 0.5 }}
    aria-hidden="true"
  >
    <rect x="6" y="22" width="30" height="38" rx="3" fill={tint} />
    <rect x="42" y="8" width="26" height="52" rx="3" fill={tint} />
    <rect x="74" y="30" width="24" height="30" rx="3" fill={tint} />
    <rect x="228" y="18" width="26" height="42" rx="3" fill={tint} />
    <rect x="260" y="34" width="22" height="26" rx="3" fill={tint} />
  </svg>
);

// ----- Card 1: verified truck photo + shield badge -----
// A contained, sized-down frame (not a full-bleed inset:0 photo) — the
// source shot is a wide 3/4-view product render meant to be seen whole, at
// roughly the same footprint the old SVG truck had, sitting on the card
// rather than filling it edge-to-edge.
const TruckPhotoWrap = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: ${({ theme }) => theme.space(4)};
`;

const TruckPhotoFrame = styled.div`
  position: relative;
  width: 200px;
  height: 128px;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.shadow.card};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    width: 228px;
    height: 146px;
  }
`;

const TruckPhoto = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 48%;
`;

const VerifiedShieldBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  color: #ffffff;
  box-shadow: ${({ theme }) => theme.shadow.card};
`;

const VerifiedTruckIllustration = ({ theme }) => (
  <TruckPhotoWrap aria-hidden="true">
    <Skyline tint={theme.color.lightBlue} />
    <TruckPhotoFrame>
      <TruckPhoto src={verifiedTruckSrc} alt="" />
      <VerifiedShieldBadge>
        <ShieldCheck size={18} strokeWidth={2.4} />
      </VerifiedShieldBadge>
    </TruckPhotoFrame>
  </TruckPhotoWrap>
);

// ----- Card 2: booking status tracker + route map -----
const TrackerWrap = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(4)};
  padding: 0 ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(6)};
`;

const StatusRow = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
`;

const StatusLine = styled.div`
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  height: 2px;
  background: ${({ theme }) => theme.color.border};
`;

const StatusStep = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const StatusDot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #ffffff;
  background: ${({ $color }) => $color};
`;

const StatusLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  white-space: nowrap;
`;

const STATUS_STEPS = (theme) => [
  { label: "Confirmed", icon: CheckCircle2, color: theme.color.success },
  { label: "On the Way", icon: Truck, color: theme.color.accent },
  { label: "Picked Up", icon: Package, color: theme.color.orange },
  { label: "Delivered", icon: CheckCircle2, color: theme.color.success },
];

const MapArt = styled.svg`
  display: block;
  width: 100%;
  height: 80px;
`;

const BookingTrackerIllustration = ({ theme }) => (
  <TrackerWrap aria-hidden="true">
    <StatusRow>
      <StatusLine />
      {STATUS_STEPS(theme).map(({ label, icon: Icon, color }) => (
        <StatusStep key={label}>
          <StatusDot $color={color}>
            <Icon size={14} strokeWidth={2.5} />
          </StatusDot>
          <StatusLabel>{label}</StatusLabel>
        </StatusStep>
      ))}
    </StatusRow>
    <MapArt viewBox="0 0 260 80" preserveAspectRatio="none">
      <rect x="0" y="0" width="260" height="80" rx="10" fill={theme.color.lightBlue} />
      <path
        d="M28 60 C 70 20, 150 78, 220 22"
        fill="none"
        stroke={theme.color.accent}
        strokeWidth="2.5"
        strokeDasharray="1 8"
        strokeLinecap="round"
      />
      <circle cx="28" cy="60" r="7" fill={theme.color.accent} stroke="#ffffff" strokeWidth="2" />
      <path
        d="M220 8 c8 0 14 6 14 14 c0 10 -14 22 -14 22 s-14 -12 -14 -22 c0 -8 6 -14 14 -14 Z"
        fill={theme.color.orange}
      />
      <circle cx="220" cy="22" r="4.5" fill="#ffffff" />
    </MapArt>
  </TrackerWrap>
);

// ----- Card 3: 0% commission -----
const CommissionArt = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BigZero = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  font-size: 76px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: ${({ theme }) => theme.color.accent};
`;

const PercentSign = styled.span`
  font-size: 34px;
  font-weight: 800;
  margin-top: 6px;
`;

const RupeeBadge = styled.div`
  position: absolute;
  right: -6px;
  bottom: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ffffff;
  border: 2.5px solid ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accent};
  box-shadow: ${({ theme }) => theme.shadow.card};
`;

const SparkleGroup = styled.svg`
  position: absolute;
  top: 8px;
  right: 26px;
  width: 30px;
  height: 30px;
`;

const CommissionIllustration = ({ theme }) => (
  <CommissionArt aria-hidden="true">
    <Skyline tint={theme.color.lightBlue} />
    <BigZero>
      0<PercentSign>%</PercentSign>
      <RupeeBadge>
        <IndianRupee size={20} strokeWidth={2.6} />
      </RupeeBadge>
      <SparkleGroup viewBox="0 0 30 30">
        <path d="M4 18 L10 12" stroke={theme.color.statsGreen} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14 6 L16 12" stroke={theme.color.statsGreen} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 10 L26 14" stroke={theme.color.statsGreen} strokeWidth="2.5" strokeLinecap="round" />
      </SparkleGroup>
    </BigZero>
  </CommissionArt>
);

// ----- Dedicated Support strip -----
const SupportStrip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(4)};
  max-width: 1180px;
  margin: ${({ theme }) => theme.space(8)} auto 0;
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(6)};
  background: ${({ theme }) => theme.color.lightBlue};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 20px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-direction: row;
    align-items: center;
    gap: ${({ theme }) => theme.space(6)};
  }
`;

const SupportIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ffffff;
  color: ${({ theme }) => theme.color.accent};
`;

const SupportText = styled.div`
  flex: 1;
`;

const SupportTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 2px;
`;

const SupportBody = styled.div`
  font-size: 14.5px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const SupportDivider = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
    align-self: stretch;
    width: 1px;
    background: ${({ theme }) => theme.color.border};
  }
`;

const SupportContact = styled.div`
  flex-shrink: 0;
`;

const SupportLabel = styled.div`
  font-size: 13.5px;
  color: ${({ theme }) => theme.color.textMuted};
  margin-bottom: 2px;
`;

const SupportPhone = styled.a`
  display: inline-block;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
`;

// The client reference's light-blue "How it works" panel — a single
// rounded card (not full-bleed) with the heading on the left and four
// steps flowing horizontally to its right, replacing the old accent-tinted
// full-width band + shipper/transporter audience-tab pair — that level of
// per-audience detail lives on /help instead.
const HowSection = styled.section`
  margin-top: ${({ theme }) => theme.space(16)};
  padding: 0 ${({ theme }) => theme.space(4)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 0 ${({ theme }) => theme.space(6)};
  }
`;

const HowCard = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(7)};
  background: ${({ theme }) => theme.color.lightBlue};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 24px;
  padding: ${({ theme }) => theme.space(7)} ${({ theme }) => theme.space(5)};
  animation: ${fadeInUp} 0.5s ease both;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    flex-direction: row;
    align-items: center;
    gap: ${({ theme }) => theme.space(8)};
    padding: ${({ theme }) => theme.space(9)} ${({ theme }) => theme.space(9)};
  }
`;

const HowHeading = styled.h2`
  flex-shrink: 0;
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.navy};

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    font-size: 2.1rem;
    max-width: 200px;
  }
`;

const HowBrandOrange = styled.span`
  color: ${({ theme }) => theme.color.orange};
`;

// Flex (not grid) so a plain, hidden-below-desktop StepArrow sibling can sit
// between each pair of steps without fragile gap-spanning pseudo-element
// math — each connector is a real element instead of a computed offset.
const HowSteps = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space(7)};
  flex: 1;
  min-width: 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.space(8)} ${({ theme }) => theme.space(5)};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: flex;
    align-items: flex-start;
  }
`;

const HowStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  animation: ${fadeInUp} 0.5s ease both;
  animation-delay: ${({ $i = 0 }) => 0.1 + $i * 0.08}s;
`;

const StepArrow = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    padding-top: 26px;
    color: ${({ theme }) => theme.color.accent};
    opacity: 0.45;
  }
`;

const StepIconWrap = styled.div`
  position: relative;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.accent};
`;

const StepNumberBadge = styled.span`
  position: absolute;
  top: -4px;
  left: -4px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.onAccent};
  border: 2px solid ${({ theme }) => theme.color.lightBlue};
  font-size: 10.5px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const StepTitle = styled.div`
  font-size: 15.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.navy};
`;

const StepBody = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textMuted};
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
  // Grid items default to min-width:auto, which refuses to shrink below an
  // unbroken string's full width (e.g. a long generated city name with no
  // spaces) — that's what was pushing this column wider than the viewport.
  // min-width:0 here + overflow-wrap on the text below lets it actually
  // wrap instead of forcing the grid track to overflow.
  min-width: 0;
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

// Flex children default to min-width:auto too — same fix as RouteChip
// itself, one level down, since this is what actually holds the city-name
// text that needs to be allowed to shrink/wrap.
const RouteChipText = styled.div`
  min-width: 0;
`;

const RouteChipCities = styled.div`
  font-weight: 700;
  font-size: 14.5px;
  margin-bottom: 3px;
  overflow-wrap: break-word;
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

// The single-line strip inside the search card's bottom edge — distinct
// from both HERO_TRUST_ITEMS (icon + title + body, inside the hero text
// column) and VALUE_PROPS (the full below-hero section) — this one's just
// an icon and a label, read at a glance while the eye is still on the card.
const TRUST_STRIP_ITEMS = [
  { icon: ShieldCheck, label: "Verified Trucks & Users" },
  { icon: Clock3, label: "On-time Deliveries" },
  { icon: ShieldCheck, label: "Safe & Secure Transactions" },
  { icon: Headphones, label: "24/7 Support" },
];

// The hero's compact 3-item trust row — a tighter, glance-only subset of
// VALUE_PROPS below (which gets its own full section with more room for
// body copy). Kept separate rather than slicing VALUE_PROPS so each can
// word its copy for its own space constraints.
const HERO_TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Verified Users & Trucks",
    body: "Connect with verified transporters and shippers.",
  },
  {
    icon: MapPin,
    title: "Booking Status",
    body: "Track your booking from pickup to drop-off.",
  },
  {
    icon: IndianRupee,
    title: "Free to Connect",
    body: "No platform commission. Connect directly and pay as you agree.",
  },
];

const WHY_CARDS = [
  {
    icon: ShieldCheck,
    title: "Verified Transporters",
    body: "Every transporter is ID-verified before they can list spare capacity.",
    Illustration: VerifiedTruckIllustration,
  },
  {
    icon: MapPin,
    title: "Booking status, every step",
    body: "Follow your booking from confirmed to picked up to delivered.",
    Illustration: BookingTrackerIllustration,
  },
  {
    icon: Gift,
    title: "100% Free — No Commission",
    body: "No platform fee, no listing fee, no hidden charges.\nAgree on the price directly and keep every rupee.",
    Illustration: CommissionIllustration,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    icon: Search,
    title: "Search",
    body: "Shipper searches for available truck capacity on the desired route.",
  },
  {
    icon: Send,
    title: "Request",
    body: "Send a booking request to the transporter.",
  },
  {
    icon: CheckCircle2,
    title: "Accept",
    body: "Transporter reviews and accepts the request.",
  },
  {
    icon: Truck,
    title: "Ship",
    body: "Pickup, in-transit and drop-off. Track booking till completion.",
  },
];

// The highest-value questions for a first-time visitor deciding whether to
// trust the platform — pulled from the same data Help.jsx renders in full
// (frontend/src/content/faq.js), so the answers can't drift out of sync
// between the two pages.
const HOME_FAQ_IDS = [
  "what-is-truckgee",
  "how-does-truckgee-work",
  "how-is-price-decided",
  "online-payments",
  "cancel-my-shipment",
  "transporters-verified",
];
const ALL_FAQ_ITEMS = FAQ_CATEGORIES.flatMap((cat) => cat.items);
const HOME_FAQS = HOME_FAQ_IDS.map((id) => ALL_FAQ_ITEMS.find((item) => item.id === id)).filter(Boolean);

export const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { platformName } = useBranding();
  usePageMeta({
    description: `${platformName} — ship for less, earn from empty space. Discover spare truck capacity on routes across India, matched by route, zero commission — 100% free to use.`,
  });
  // "How TruckGee Works" splits the brand name into a navy part + an
  // orange part (client brief's exact treatment) — split after "Truck"
  // when the name actually starts with it (true for every brand name this
  // product has used so far), otherwise fall back to showing the whole
  // name in navy rather than guessing a wrong split point.
  const brandTruckPart = /^truck/i.test(platformName) ? platformName.slice(0, 5) : "";
  const brandRestPart = /^truck/i.test(platformName) ? platformName.slice(5) : platformName;
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
  const [departureAt, setDepartureAt] = useState(toDateInputValue());
  const capacityAmount = useUnitAmount();
  const [errors, setErrors] = useState({});
  // Below tablet width, the From/To fields are too narrow for the full
  // "Pickup address or area" placeholder — it truncated mid-word ("Picku…").
  // Short placeholders instead of letting the browser clip the long ones.
  // Also gates the From field's autoFocus below — on a short mobile
  // viewport the search card sits below the fold under the stacked hero,
  // so autofocusing it forced an unrequested scroll-into-view (and likely
  // the on-screen keyboard) the instant the page loaded.
  const isMobile = useMediaQuery(`(max-width: 767px)`);
  const fromPlaceholder = isMobile ? "Pick" : "Pickup address or area";
  const toPlaceholder = isMobile ? "Drop" : "Drop address or area";
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

  // Same-page and cross-page hash-anchor scrolling (e.g. Navbar's "How it
  // Works" link) is now handled app-wide by components/ScrollManager.jsx.

  // Search matches trips by date only (±1 day window). capacityTons carries
  // through as `minCapacity`, which SearchResults already reads to pre-fill
  // its own capacity filter.
  const goToSearch = (from, to, whenDate, capacityTons) => {
    const params = new URLSearchParams({
      fromCity: from.trim(),
      toCity: to.trim(),
      date: whenDate.slice(0, 10),
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
    if (!departureAt) nextErrors.departureAt = "Pick a date";
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
    goToSearch(route.fromCity, route.toCity, toDateInputValue(), capacityAmount.tons);
  };

  return (
    <>
      <WebsiteSchema />
      <HeroSection>
        <HeroGlow aria-hidden="true" />
        <HeroInner>
          <HeroGrid>
            <HeroLeft>
              <Eyebrow>
                <span role="img" aria-label="India flag">
                  🇮🇳
                </span>
                India's Smart Truck Capacity Marketplace
              </Eyebrow>
              <HeroTitle>
                Turn Empty
                <br />
                <AccentText>Truck Space</AccentText>
                <br />
                Into Opportunity.
              </HeroTitle>
              <HeroDivider aria-hidden="true" />
              <HeroSubtitle>
                Find spare capacity on trucks already on the road or share your available space on an
                existing route.
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
                  {/* viewBox proportioned to roughly match the frame's own
                      rendered aspect ratio — a square 100x100 viewBox
                      stretched with preserveAspectRatio="none" onto a wide
                      box distorts stroke-width/dasharray unevenly (dashes
                      read as blobs). */}
                  <RoutePath viewBox="0 0 280 200" preserveAspectRatio="none">
                    <path
                      d="M 258 32 C 230 70, 250 110, 235 178"
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="1.6"
                      strokeDasharray="1 8"
                      strokeLinecap="round"
                      opacity="0.75"
                    />
                  </RoutePath>
                  <RouteTo>
                    <MapPin size={14} strokeWidth={2.6} color="#15803d" fill="#15803d" fillOpacity={0.15} />
                    Delhi
                  </RouteTo>
                  <RouteFrom>
                    <MapPin size={14} strokeWidth={2.6} color="#f26b21" fill="#f26b21" fillOpacity={0.18} />
                    Gurugram
                  </RouteFrom>
                </RouteViz>
              </TruckImageFrame>
            </HeroRight>
          </HeroGrid>
        </HeroInner>
      </HeroSection>

      <SearchCardWrap>
        <SearchCard as="form" onSubmit={handleSearch}>
          <TopBorderTrack aria-hidden="true">
            <RunningTruck src={truckRunnerSrc} alt="" />
          </TopBorderTrack>
          <SearchCardHeader>
            <div>
              <SearchCardTitle>Find Truck Capacity</SearchCardTitle>
              <SearchCardSubtitle>Search available trucks on your route</SearchCardSubtitle>
            </div>
            <ShareCapacityLink to="/trips/new">
              or Share Your Truck Capacity
              <ArrowUpRight size={15} strokeWidth={2.6} />
            </ShareCapacityLink>
          </SearchCardHeader>
          <Stack $gap={4}>
            <SwapRow>
              <Field label="From" error={errors.fromCity}>
                <LocationAutocomplete
                  placeholder={fromPlaceholder}
                  value={fromPoint}
                  onChange={handleFromChange}
                  onResolve={setFromCityResolved}
                  showPreview={false}
                  autoFocus={!isMobile}
                />
              </Field>
              <SwapButton type="button" onClick={handleSwap} aria-label="Swap locations" title="Swap locations">
                <ArrowLeftRight size={16} strokeWidth={2.4} />
              </SwapButton>
              <Field label="To" error={errors.toCity}>
                <LocationAutocomplete
                  placeholder={toPlaceholder}
                  value={toPoint}
                  onChange={handleToChange}
                  onResolve={setToCityResolved}
                  showPreview={false}
                />
              </Field>
            </SwapRow>

            <SearchFieldsRow>
              <Field label="Date" error={errors.departureAt}>
                <Input
                  type="date"
                  lang="en-GB"
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
                <ButtonLabelSpacer aria-hidden="true">Search</ButtonLabelSpacer>
                <SearchSubmitButton type="submit" $size="lg" $fullWidth>
                  <Search size={17} strokeWidth={2.4} />
                  Search trucks
                </SearchSubmitButton>
              </div>
            </SearchFieldsRow>
          </Stack>

          <CardTrustStrip>
            {TRUST_STRIP_ITEMS.map(({ icon: Icon, label }, i) => (
              <Fragment key={label}>
                {i > 0 && <TrustStripDivider aria-hidden="true" />}
                <TrustStripItem>
                  <Icon size={15} strokeWidth={2.2} />
                  {label}
                </TrustStripItem>
              </Fragment>
            ))}
          </CardTrustStrip>
        </SearchCard>
      </SearchCardWrap>

      <PageContainer>
        <Section as="div" style={{ paddingTop: 0 }}>
          <WhySectionHead>
            <WhyEyebrow>Why {platformName}</WhyEyebrow>
            <WhyHeading>Built for trust, mile after mile</WhyHeading>
            <WhyLede>
              Every part of the booking is verified, tracked, and free of charge — and backed up if
              something goes wrong.
            </WhyLede>
          </WhySectionHead>
          <WhyGrid>
            {WHY_CARDS.map(({ icon: Icon, title, body, Illustration }, i) => (
              <WhyCard key={title} $i={i}>
                <WhyCardTop>
                  <WhyCardIcon>
                    <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
                  </WhyCardIcon>
                  <WhyCardTitle>{title}</WhyCardTitle>
                  <WhyCardBody>{body}</WhyCardBody>
                </WhyCardTop>
                <WhyCardIllustration>
                  <Illustration theme={theme} />
                </WhyCardIllustration>
              </WhyCard>
            ))}
          </WhyGrid>

          <SupportStrip>
            <SupportIcon>
              <Headphones size={22} strokeWidth={2.2} aria-hidden="true" />
            </SupportIcon>
            <SupportText>
              <SupportTitle>Dedicated Support</SupportTitle>
              <SupportBody>Need help? Our support team is here to assist you.</SupportBody>
            </SupportText>
            <SupportDivider aria-hidden="true" />
            <SupportContact>
              <SupportLabel>Reach us anytime</SupportLabel>
              <SupportPhone href="tel:+918130170669">+91 81301 70669</SupportPhone>
            </SupportContact>
          </SupportStrip>
        </Section>
      </PageContainer>

      <HowSection id="how-it-works">
        <HowCard>
          <HowHeading>
            How
            <br />
            <HowBrandOrange>{brandTruckPart}</HowBrandOrange>
            {brandRestPart} Works
          </HowHeading>
          <HowSteps>
            {HOW_IT_WORKS_STEPS.map(({ icon: Icon, title, body }, i) => (
              <Fragment key={title}>
                {i > 0 && (
                  <StepArrow aria-hidden="true">
                    <ArrowRight size={16} strokeWidth={2.2} />
                  </StepArrow>
                )}
                <HowStep $i={i}>
                  <StepIconWrap>
                    <StepNumberBadge>{i + 1}</StepNumberBadge>
                    <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
                  </StepIconWrap>
                  <StepTitle>{title}</StepTitle>
                  <StepBody>{body}</StepBody>
                </HowStep>
              </Fragment>
            ))}
          </HowSteps>
        </HowCard>
      </HowSection>

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
                    <RouteChipText>
                      <RouteChipCities>
                        {route.fromCity} → {route.toCity}
                      </RouteChipCities>
                      <RouteChipCount>
                        {route.count} {route.count === 1 ? "trip" : "trips"} available
                      </RouteChipCount>
                    </RouteChipText>
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
          <FaqMoreLink to="/faq">
            See all questions in the FAQ
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

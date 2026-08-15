import { Link } from "react-router-dom";
import styled from "styled-components";
import { Truck, ShieldCheck, MapPin, Wallet as WalletIcon } from "lucide-react";
import heroTruckSrc from "../assets/hero-truck.png";

const FEATURES = [
  { icon: ShieldCheck, text: "Every transporter and shipper is KYC-verified before they can book" },
  { icon: MapPin, text: "Track your shipment live on the map from pickup to drop" },
  { icon: WalletIcon, text: "Pay and get paid through a secure in-app wallet" },
];

// Auth gets its own full-screen shell — same "not nested under the
// consumer Layout" reasoning as the dashboard/admin shells: a login form
// squeezed between the marketing navbar and footer never reads as a
// finished, deliberate screen, no matter how the card itself is styled.
const Shell = styled.div`
  min-height: 100%;
  display: flex;
`;

const BrandPanel = styled.div`
  display: none;
  position: relative;
  flex: 0 0 44%;
  max-width: 560px;
  background: ${({ theme }) => theme.color.text};
  color: ${({ theme }) => theme.color.bg};
  padding: 52px 48px;
  overflow: hidden;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
`;

const Glow = styled.div`
  position: absolute;
  top: -15%;
  right: -30%;
  width: 80%;
  height: 70%;
  background: radial-gradient(circle, ${({ theme }) => theme.color.accent}3d 0%, transparent 70%);
  pointer-events: none;
`;

const RoadLines = styled.div`
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    115deg,
    transparent 0,
    transparent 64px,
    rgba(255, 255, 255, 0.035) 64px,
    rgba(255, 255, 255, 0.035) 66px
  );
  pointer-events: none;
`;

const BrandMark = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.bg};
`;

const BrandIcon = styled.span`
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: ${({ theme }) => theme.shadow.accentGlow};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.onAccent};
  flex: none;
`;

const BrandBody = styled.div`
  position: relative;
  max-width: 400px;
`;

const Headline = styled.h1`
  font-size: 2.1rem;
  line-height: 1.18;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
  text-wrap: balance;
`;

const HeadlineAccent = styled.span`
  color: ${({ theme }) => theme.color.accent};
`;

const Subcopy = styled.p`
  margin: 0 0 32px;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.68);
`;

const FeatureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.86);
`;

const FeatureIconWrap = styled.span`
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.accent};
`;

const TruckArt = styled.img`
  position: relative;
  width: 100%;
  max-width: 380px;
  filter: drop-shadow(0 24px 40px rgba(0, 0, 0, 0.45));
  align-self: center;
`;

const FormPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px 40px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 40px 32px 48px;
  }
`;

const MobileBrand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
  margin-bottom: 28px;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: none;
  }
`;

const MobileBrandIcon = styled.span`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: ${({ theme }) => theme.shadow.accentGlow};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.onAccent};
`;

const FormInner = styled.div`
  width: 100%;
  max-width: 400px;
  // Top-anchored on mobile (a form floating in the vertical middle of a
  // tall phone screen reads as lost, not deliberate) — true vertical
  // centering only once the brand panel is there to balance against.
  margin: 8px 0 auto;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    margin: auto 0;
  }
`;

const Legal = styled.p`
  width: 100%;
  max-width: 400px;
  text-align: center;
  margin: 28px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textFaint};

  a {
    color: ${({ theme }) => theme.color.textMuted};
    font-weight: 600;
  }
`;

export const AuthShell = ({ children }) => (
  <Shell>
    <BrandPanel>
      <Glow />
      <RoadLines />
      <BrandMark to="/">
        <BrandIcon>
          <Truck size={18} strokeWidth={2.4} />
        </BrandIcon>
        ShareTruck
      </BrandMark>

      <BrandBody>
        <Headline>
          Spare truck capacity, <HeadlineAccent>ready when you are.</HeadlineAccent>
        </Headline>
        <Subcopy>
          India's marketplace for shared truck space — transporters list the room they have, shippers book it in
          minutes.
        </Subcopy>
        <FeatureList>
          {FEATURES.map(({ icon: Icon, text }) => (
            <FeatureItem key={text}>
              <FeatureIconWrap>
                <Icon size={15} strokeWidth={2.4} />
              </FeatureIconWrap>
              {text}
            </FeatureItem>
          ))}
        </FeatureList>
      </BrandBody>

      <TruckArt src={heroTruckSrc} alt="" />
    </BrandPanel>

    <FormPanel>
      <MobileBrand to="/">
        <MobileBrandIcon>
          <Truck size={16} strokeWidth={2.4} />
        </MobileBrandIcon>
        ShareTruck
      </MobileBrand>

      <FormInner>{children}</FormInner>

      <Legal>
        <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link>
      </Legal>
    </FormPanel>
  </Shell>
);

export default AuthShell;

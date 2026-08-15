import styled from "styled-components";
import heroTruckSrc from "../assets/hero-truck.png";
import { truckBob, dashScroll, driveAcross, puff } from "../theme/animations";

// Decorative hero banner: a truck driving left-to-right across a road strip,
// looping forever. Used on the landing page (and anywhere else that wants a
// bit of "real truck" motion) — purely visual, not a loading indicator.

const Banner = styled.div`
  position: relative;
  height: 132px;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.color.surfaceRaised} 0%,
    ${({ theme }) => theme.color.surface} 100%
  );
  border: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    height: 168px;
  }
`;

const Glow = styled.div`
  position: absolute;
  top: -40%;
  right: -10%;
  width: 60%;
  height: 180%;
  background: radial-gradient(circle, ${({ theme }) => theme.color.accentSoft} 0%, transparent 70%);
`;

const Road = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 30px;
  height: 3px;
  background: ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    bottom: 38px;
  }
`;

const RoadDashes = styled.svg`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

const DashLine = styled.line`
  stroke: ${({ theme }) => theme.color.borderStrong};
  stroke-width: 3;
  stroke-dasharray: 16 14;
  animation: ${dashScroll} 0.7s linear infinite;
`;

const Track = styled.div`
  position: absolute;
  left: 0;
  bottom: 24px;
  width: 100%;
  animation: ${driveAcross} 13s linear infinite;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    bottom: 32px;
  }
`;

const TruckWrap = styled.div`
  position: relative;
  display: inline-block;
  animation: ${truckBob} 0.9s ease-in-out infinite;
`;

const Shadow = styled.div`
  position: absolute;
  bottom: -7px;
  left: 10%;
  width: 78%;
  height: 9px;
  border-radius: 50%;
  background: rgba(20, 21, 15, 0.16);
  filter: blur(3px);
`;

const TruckImg = styled.img`
  display: block;
  height: 76px;
  width: auto;
  filter: drop-shadow(0 4px 4px rgba(20, 21, 15, 0.18));

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    height: 102px;
  }
`;

const Puff = styled.div`
  position: absolute;
  top: 8%;
  left: 82%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c7c7c2;
  animation: ${puff} 1.4s ease-out infinite;
`;

export const TruckHero = () => (
  <Banner aria-hidden="true">
    <Glow />
    <Road />
    <RoadDashes preserveAspectRatio="none">
      <DashLine x1="0" y1="1.5" x2="100%" y2="1.5" />
    </RoadDashes>

    <Track>
      <TruckWrap>
        <Shadow />
        <Puff />
        <Puff style={{ animationDelay: "0.5s" }} />
        <TruckImg src={heroTruckSrc} alt="" width={900} height={533} />
      </TruckWrap>
    </Track>
  </Banner>
);

export default TruckHero;

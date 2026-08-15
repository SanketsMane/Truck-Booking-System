import styled from "styled-components";
import { truckBob, wheelSpin, dashScroll } from "../../theme/animations";

// A compact animated truck-on-a-road loading indicator — the app's signature
// loading state, used everywhere a plain spinner used to sit. Built as real
// SVG shapes (not an emoji/illustration) so the wheels can spin and the
// road markings can scroll independently.

const Wrap = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size = 28 }) => $size * 1.7}px;
  height: ${({ $size = 28 }) => $size}px;
  color: ${({ theme, $color }) => $color ?? theme.color.text};
  --truck-accent: ${({ theme }) => theme.color.accent};
  --truck-bg: ${({ theme }) => theme.color.bg};
`;

const Svg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const Body = styled.g`
  animation: ${truckBob} 0.9s ease-in-out infinite;
`;

const Wheel = styled.g`
  transform-box: fill-box;
  transform-origin: 50% 50%;
  animation: ${wheelSpin} 0.55s linear infinite;
`;

const Road = styled.line`
  stroke: ${({ theme }) => theme.color.border};
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 5 7;
  animation: ${dashScroll} 0.45s linear infinite;
`;

export const TruckLoader = ({ $size = 28, $color, label = "Loading" }) => (
  <Wrap $size={$size} $color={$color} role="status" aria-label={label}>
    <Svg viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <Road x1="2" y1="34.5" x2="62" y2="34.5" />

      <Body>
        {/* trailer */}
        <rect x="6" y="12" width="30" height="16" rx="2.5" fill="currentColor" />
        <rect x="6" y="19" width="30" height="4" fill="var(--truck-accent)" />

        {/* cab */}
        <rect x="38" y="15" width="15" height="13" rx="2.5" fill="currentColor" />
        <rect x="41" y="17.5" width="8.5" height="6" rx="1.2" fill="var(--truck-bg)" opacity="0.92" />
        <rect x="52.5" y="23.5" width="3" height="3.5" rx="1" fill="var(--truck-accent)" />

        {/* wheels */}
        <Wheel>
          <circle cx="16" cy="29.5" r="5" fill="currentColor" />
          <circle cx="16" cy="29.5" r="1.8" fill="var(--truck-bg)" />
          <rect x="15.2" y="25.2" width="1.6" height="8.6" fill="var(--truck-bg)" opacity="0.8" />
        </Wheel>
        <Wheel>
          <circle cx="46" cy="29.5" r="5" fill="currentColor" />
          <circle cx="46" cy="29.5" r="1.8" fill="var(--truck-bg)" />
          <rect x="45.2" y="25.2" width="1.6" height="8.6" fill="var(--truck-bg)" opacity="0.8" />
        </Wheel>
      </Body>
    </Svg>
  </Wrap>
);

export default TruckLoader;

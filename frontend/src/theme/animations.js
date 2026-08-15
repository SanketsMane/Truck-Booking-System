import { keyframes } from "styled-components";

// Shared motion vocabulary — imported wherever a styled-component needs one
// of these, so every entrance/loading animation in the app moves the same
// way instead of each page inventing its own curve/distance.

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

// Truck body bobbing gently on its suspension while idling/driving in place.
export const truckBob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2.5px); }
`;

export const wheelSpin = keyframes`
  to { transform: rotate(360deg); }
`;

// Dashed road markings scrolling under the truck to sell forward motion
// without the truck itself having to travel anywhere.
export const roadDash = keyframes`
  to { background-position: -48px 0; }
`;

// Puff of exhaust/dust rising and fading behind the truck.
export const puff = keyframes`
  0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  35% { opacity: 0.5; }
  100% { opacity: 0; transform: translate(-10px, -8px) scale(1.1); }
`;

export const pulseSoft = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

// SVG-native dash scroll (stroke-dashoffset) for road markings drawn as an
// actual <line>/<path>, as opposed to roadDash's CSS background-position
// variant used on plain HTML elements.
export const dashScroll = keyframes`
  to { stroke-dashoffset: -24; }
`;

// A truck driving fully across its container, left to right, on a loop —
// used for the decorative hero banner rather than the compact loader.
export const driveAcross = keyframes`
  from { transform: translateX(-15%); }
  to { transform: translateX(115%); }
`;

export default {
  fadeInUp,
  fadeIn,
  scaleIn,
  truckBob,
  wheelSpin,
  roadDash,
  puff,
  pulseSoft,
  dashScroll,
  driveAcross,
};

import styled, { css } from "styled-components";
import { shimmer } from "../../theme/animations";
import { Tr, Td } from "./Table";

// Shape-matched loading placeholders — used instead of a bare Spinner on
// pages with data-heavy layouts (result lists, detail cards, tables), so
// the loading state previews the real content's shape rather than just
// signaling "wait." TruckLoader stays the right choice for full-page/route
// transitions where the eventual content's shape isn't known yet.
//
// prefers-reduced-motion is handled globally (theme/GlobalStyle.js
// neutralizes all animation-duration), so no extra guard is needed here.
const shimmerBase = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.surfaceRaised} 25%,
    ${({ theme }) => theme.color.border} 37%,
    ${({ theme }) => theme.color.surfaceRaised} 63%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

export const SkeletonBlock = styled.div`
  ${shimmerBase}
  width: ${({ $width = "100%" }) => $width};
  height: ${({ $height = "16px" }) => $height};
  border-radius: ${({ theme, $radius }) => $radius ?? theme.radius.sm};
`;

export const SkeletonText = styled(SkeletonBlock).attrs({ as: "div" })`
  height: ${({ $size, theme }) => $size ?? theme.font.size.md};
  width: ${({ $width = "100%" }) => $width};
  border-radius: 4px;
`;

export const SkeletonCircle = styled(SkeletonBlock)`
  width: ${({ $size = "40px" }) => $size};
  height: ${({ $size = "40px" }) => $size};
  border-radius: 50%;
  flex-shrink: 0;
`;

// A single skeleton "row" shaped like a card result (avatar/icon + two
// lines of text) — the most common loading shape across SearchResults,
// admin tables, and list-style pages. Compose SkeletonBlock/Text/Circle
// directly for anything more bespoke (e.g. TripDetail's hero photo).
const RowWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)};
`;

const RowText = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

export const SkeletonRow = ({ withAvatar = true }) => (
  <RowWrap>
    {withAvatar && <SkeletonCircle $size="40px" />}
    <RowText>
      <SkeletonText $width="60%" />
      <SkeletonText $width="35%" $size="12px" />
    </RowText>
  </RowWrap>
);

// Drop-in <tbody> filler for the loading state of any admin Table — same
// row/column shape as the real data, columns default to a plausible
// varied width per index (name-shaped, then progressively narrower) rather
// than one uniform bar per cell, so a 3- or 6-column table still reads as
// "a table," not a stack of identical gray rectangles.
const DEFAULT_WIDTHS = ["70%", "85%", "50%", "60%", "40%", "55%"];

export const SkeletonTableRows = ({ rows = 6, cols = 4 }) =>
  Array.from({ length: rows }).map((_, r) => (
    <Tr key={r}>
      {Array.from({ length: cols }).map((_, c) => (
        <Td key={c}>
          <SkeletonBlock $width={DEFAULT_WIDTHS[c % DEFAULT_WIDTHS.length]} $height="13px" />
        </Td>
      ))}
    </Tr>
  ));

export default SkeletonBlock;

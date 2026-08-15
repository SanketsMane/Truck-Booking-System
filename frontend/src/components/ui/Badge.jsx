import styled from "styled-components";
import { theme } from "../../theme/theme";

const StyledBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-transform: capitalize;
  color: ${({ theme, $colorKey }) => theme.color[$colorKey] ?? theme.color.textMuted};
  background: ${({ theme, $colorKey }) => theme.color[`${$colorKey}Soft`] ?? theme.color.surfaceRaised};
`;

const statusColorKey = (status) => (status && theme.status[status]) || "textMuted";

// Looks up the semantic color for a booking/trip/verification/etc. status
// string via theme.status, so every screen renders the same status the
// same color without each page re-deriving the mapping.
export const StatusBadge = ({ status, children }) => (
  <StyledBadge $colorKey={statusColorKey(status)}>{children ?? status}</StyledBadge>
);

export default StatusBadge;

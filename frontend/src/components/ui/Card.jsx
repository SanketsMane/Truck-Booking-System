import styled, { css } from "styled-components";

// $variant="admin" reads theme.admin.* instead of theme.color.* — same
// additive opt-in pattern as Table.jsx, so the consumer-facing app's cards
// (Home, Wallet, booking pages) render exactly as before.
export const Card = styled.div`
  background: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.surface : theme.color.surface)};
  border: 1px solid ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.border : theme.color.border)};
  border-radius: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.radius.card : theme.radius.md)};
  padding: ${({ theme, $padding }) => $padding ?? theme.space(4)};
  box-shadow: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.shadow.card : theme.shadow.card)};
  transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  /* One notch more breathing room once there's room to give it — an
     explicit $padding override (e.g. a modal or table card that wants 0)
     always wins, at every breakpoint. */
  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme, $padding }) => $padding ?? theme.space(5)};
  }

  ${({ $interactive, $variant }) =>
    $interactive &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${({ theme }) => ($variant === "admin" ? theme.admin.shadow.raised : theme.shadow.raised)};
        border-color: ${({ theme }) =>
          $variant === "admin" ? theme.admin.color.textMuted : theme.color.borderStrong};
      }
      &:active {
        transform: translateY(0);
      }
    `}
`;

export const CardRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
`;

export default Card;

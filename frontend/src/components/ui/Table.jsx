import styled from "styled-components";

// Horizontal-scroll container every wide table renders inside. Scrolling
// itself was already safe everywhere (this wrapper is applied consistently,
// so no table has ever overflowed the page) — what it lacked was any visual
// cue that there's more to scroll to. A CSS-only scroll-shadow (Lea Verou's
// technique: two background-attachment:local gradients that scroll with the
// content, layered under two attachment:scroll ones that don't) fades in a
// shadow at whichever edge still has hidden content and disappears once
// you've scrolled all the way to it — no JS/scroll-listener needed. `$variant`
// mirrors the cell components below so the fade matches whichever surface
// color the table is actually sitting on.
export const TableScroll = styled.div`
  --scroll-shadow-bg: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.surface : theme.color.surface)};
  overflow-x: auto;
  background-color: var(--scroll-shadow-bg);
  background-repeat: no-repeat;
  background-size: 32px 100%, 32px 100%, 12px 100%, 12px 100%;
  background-position: 0 0, 100% 0, 0 0, 100% 0;
  background-attachment: local, local, scroll, scroll;
  background-image: linear-gradient(to right, var(--scroll-shadow-bg) 30%, rgba(255, 255, 255, 0)),
    linear-gradient(to left, var(--scroll-shadow-bg) 30%, rgba(255, 255, 255, 0)),
    radial-gradient(farthest-side at 0% 50%, rgba(17, 19, 24, 0.14), rgba(17, 19, 24, 0)),
    radial-gradient(farthest-side at 100% 50%, rgba(17, 19, 24, 0.14), rgba(17, 19, 24, 0));
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  min-width: ${({ $minWidth }) => $minWidth || "760px"};
  font-variant-numeric: tabular-nums;
`;

// Every cell/row below defaults to the consumer-app palette (theme.color.*)
// and takes an optional `$variant="admin"` to read theme.admin.color.*
// instead — additive, opt-in, so the one consumer page that already uses
// this table (Wallet.jsx) renders exactly as before while admin pages can
// opt into the new admin palette one call-site at a time.
export const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.textMuted : theme.color.textMuted)};
  font-weight: 600;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.border : theme.color.border)};
  white-space: nowrap;
`;

export const Td = styled.td`
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.border : theme.color.border)};
  vertical-align: middle;
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.text : "inherit")};
`;

export const Tr = styled.tr`
  &:hover {
    background: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.bg : theme.color.surfaceRaised)};
  }
`;

// First-column serial number, used consistently across every admin table.
export const IndexTh = styled(Th)`
  width: 40px;
  text-align: right;
`;

export const IndexTd = styled(Td)`
  width: 40px;
  text-align: right;
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.textMuted : theme.color.textFaint)};
  font-variant-numeric: tabular-nums;
`;

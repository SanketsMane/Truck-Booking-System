import styled from "styled-components";
import {
  TableScroll as BaseTableScroll,
  Table as BaseTable,
  Th as BaseTh,
  Td as BaseTd,
  Tr as BaseTr,
  IndexTh as BaseIndexTh,
  IndexTd as BaseIndexTd,
} from "./Table";
import { Card as BaseCard } from "./Card";
import { SkeletonBlock as BaseSkeletonBlock } from "./Skeleton";

// Admin pages import from here instead of ./Table directly — same table
// primitives, pinned to the admin palette via `.attrs()` so call sites
// don't need `$variant="admin"` on every single <Td>/<Tr>. One import-path
// swap per page instead of touching every cell.
export const Table = styled(BaseTable).attrs({ $variant: "admin" })``;
export const Th = styled(BaseTh).attrs({ $variant: "admin" })``;
export const Td = styled(BaseTd).attrs({ $variant: "admin" })``;
export const Tr = styled(BaseTr).attrs({ $variant: "admin" })``;
export const IndexTh = styled(BaseIndexTh).attrs({ $variant: "admin" })``;
export const IndexTd = styled(BaseIndexTd).attrs({ $variant: "admin" })``;

// Same pin for Card (the toolbar/table wrapper on every admin list page),
// the scroll-shadow background, and the skeleton fill color (so loading-
// state shimmer and the scroll fade both sit on the admin surface tone,
// not the consumer one).
export const AdminCard = styled(BaseCard).attrs({ $variant: "admin" })``;
export const TableScroll = styled(BaseTableScroll).attrs({ $variant: "admin" })``;

const AdminSkeletonBase = styled(BaseSkeletonBlock)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.admin.color.bg} 25%,
    ${({ theme }) => theme.admin.color.border} 37%,
    ${({ theme }) => theme.admin.color.bg} 63%
  );
  background-size: 400% 100%;
`;

// Drop-in <tbody> filler matching AdminTable's row/column shape — same
// contract as components/ui/Skeleton's SkeletonTableRows, just tinted for
// the admin surface instead of the consumer one.
const DEFAULT_WIDTHS = ["70%", "85%", "50%", "60%", "40%", "55%"];

export const AdminSkeletonRows = ({ rows = 6, cols = 4 }) =>
  Array.from({ length: rows }).map((_, r) => (
    <Tr key={r}>
      {Array.from({ length: cols }).map((_, c) => (
        <Td key={c}>
          <AdminSkeletonBase $width={DEFAULT_WIDTHS[c % DEFAULT_WIDTHS.length]} $height="13px" />
        </Td>
      ))}
    </Tr>
  ));

import styled from "styled-components";

export const TableScroll = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  min-width: ${({ $minWidth }) => $minWidth || "760px"};
`;

export const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  color: ${({ theme }) => theme.color.textMuted};
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  white-space: nowrap;
`;

export const Td = styled.td`
  padding: 10px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  vertical-align: middle;
`;

export const Tr = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
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
  color: ${({ theme }) => theme.color.textFaint};
  font-variant-numeric: tabular-nums;
`;

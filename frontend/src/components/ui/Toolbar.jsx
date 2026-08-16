import styled from "styled-components";
import { Search, X } from "lucide-react";

// Consumer-palette counterpart to AdminToolbar — same search+filters+clear
// layout, themed with theme.color.* instead of theme.admin.color.* so it
// matches the shopper-facing pages (My Bookings, My Trips, My Trucks,
// Wallet, Support, Disputes) rather than the admin console.
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 320px;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  top: 50%;
  left: 11px;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.color.textFaint};
  pointer-events: none;
`;

const SearchField = styled.input`
  width: 100%;
  padding: 8px 12px 8px 34px;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: border-color ${({ theme }) => theme.motion.fast} ease;

  &::placeholder {
    color: ${({ theme }) => theme.color.textFaint};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.accent};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accentSoft};
  }
`;

export const SearchInput = (props) => (
  <SearchWrap>
    <SearchIcon size={15} strokeWidth={2.2} />
    <SearchField type="text" {...props} />
  </SearchWrap>
);

export const ToolbarSelect = styled.select`
  padding: 8px 30px 8px 12px;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  min-width: 130px;
  transition: border-color ${({ theme }) => theme.motion.fast} ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.accent};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accentSoft};
  }
`;

export const ToolbarSpacer = styled.div`
  flex: 1;
  min-width: 8px;
`;

export const ResultsCount = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  white-space: nowrap;
`;

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 10px;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  border-radius: ${({ theme }) => theme.radius.sm};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
  }
`;

export const ClearFiltersButton = ({ onClick }) => (
  <ClearButton type="button" onClick={onClick}>
    <X size={13} strokeWidth={2.4} />
    Clear filters
  </ClearButton>
);

export default Toolbar;

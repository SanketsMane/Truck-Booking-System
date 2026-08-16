import styled from "styled-components";
import { Search, X } from "lucide-react";

// A consistent filter/search toolbar for every admin list page — search
// field with an inline icon, one or more selects, and a "Clear filters"
// affordance that only appears once a filter is actually active. Visually
// distinct from the table Card below it (theme.admin.color.bg vs .surface)
// so the toolbar reads as "controls" and the table reads as "data," the
// same separation Stripe/Linear-style admin consoles use.
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.admin.color.bg};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.card};
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
  color: ${({ theme }) => theme.admin.color.textMuted};
  pointer-events: none;
`;

const SearchField = styled.input`
  width: 100%;
  padding: 8px 12px 8px 34px;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.admin.color.text};
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  transition: border-color ${({ theme }) => theme.motion.fast} ease;

  &::placeholder {
    color: ${({ theme }) => theme.admin.color.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.admin.color.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.admin.color.primarySoft};
  }
`;

export const AdminSearchInput = (props) => (
  <SearchWrap>
    <SearchIcon size={15} strokeWidth={2.2} />
    <SearchField type="text" {...props} />
  </SearchWrap>
);

export const AdminSelect = styled.select`
  padding: 8px 30px 8px 12px;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.admin.color.text};
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  min-width: 130px;
  transition: border-color ${({ theme }) => theme.motion.fast} ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.admin.color.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.admin.color.primarySoft};
  }
`;

// Plain date input, no dropdown-arrow padding reserved (unlike AdminSelect)
// — used for from/to range filters (e.g. Payments.jsx).
export const AdminDateInput = styled.input.attrs({ type: "date" })`
  padding: 7px 10px;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.admin.color.text};
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  transition: border-color ${({ theme }) => theme.motion.fast} ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.admin.color.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.admin.color.primarySoft};
  }
`;

export const ToolbarSpacer = styled.div`
  flex: 1;
  min-width: 8px;
`;

export const ResultsCount = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textMuted};
  white-space: nowrap;
`;

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 10px;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  border-radius: ${({ theme }) => theme.admin.radius.control};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.admin.color.surface};
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

export const ClearFiltersButton = ({ onClick }) => (
  <ClearButton type="button" onClick={onClick}>
    <X size={13} strokeWidth={2.4} />
    Clear filters
  </ClearButton>
);

export default Toolbar;

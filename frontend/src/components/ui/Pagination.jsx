import styled from "styled-components";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Muted } from "./Layout";

// The app's first paginated list UI — prev/next + "Page X of Y", styled to
// match the icon-button language already used in the admin sidebar/topbar.

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(4)};
`;

const StepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.surface};
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surfaceRaised};
    border-color: ${({ theme }) => theme.color.borderStrong};
  }
`;

export const Pagination = ({ page, pages, total, onPageChange }) => {
  if (!pages || pages <= 1) return null;

  return (
    <Bar>
      <StepButton
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </StepButton>
      <Muted>
        Page {page} of {pages}
        {typeof total === "number" ? ` · ${total} total` : ""}
      </Muted>
      <StepButton
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </StepButton>
    </Bar>
  );
};

export default Pagination;

import styled from "styled-components";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

// $variant="admin" reads theme.admin.* — same additive opt-in pattern as
// Table.jsx/Card.jsx. Wallet.jsx (the one consumer-facing usage) renders
// exactly as before by omitting the prop.
const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(4)};
`;

const RangeText = styled.span`
  font-size: ${({ theme, $variant }) => ($variant === "admin" ? theme.font.size.xs : "14px")};
  font-weight: ${({ $variant }) => ($variant === "admin" ? 500 : 400)};
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.textSecondary : theme.color.textMuted)};
  white-space: nowrap;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  margin-left: auto;
`;

const StepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.radius.control : theme.radius.sm)};
  border: 1px solid ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.border : theme.color.border)};
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.text : theme.color.text)};
  background: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.surface : theme.color.surface)};
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.bg : theme.color.surfaceRaised)};
    border-color: ${({ theme, $variant }) =>
      $variant === "admin" ? theme.admin.color.textMuted : theme.color.borderStrong};
  }

  &:disabled {
    opacity: 0.4;
  }
`;

const PageIndicator = styled.span`
  padding: 0 ${({ theme }) => theme.space(2)};
  font-size: ${({ theme, $variant }) => ($variant === "admin" ? theme.font.size.xs : "14px")};
  font-weight: 600;
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.text : theme.color.text)};
  white-space: nowrap;
`;

const PageSizeSelect = styled.select`
  padding: 5px 22px 5px 8px;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 500;
  color: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.text : theme.color.text)};
  background: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.surface : theme.color.surface)};
  border: 1px solid ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.color.border : theme.color.border)};
  border-radius: ${({ theme, $variant }) => ($variant === "admin" ? theme.admin.radius.control : theme.radius.sm)};
`;

// page/pages/total/onPageChange — the original contract, unchanged.
// New, all-optional: pageSize + onPageSizeChange (renders a rows-per-page
// select), pageSizeOptions, variant="admin" (admin palette). Passing
// onPageSizeChange also switches on the "enhanced" layout — an exact
// "Showing X–Y of Z" range plus first/last jump buttons — regardless of
// variant, so a consumer-palette table (e.g. Wallet.jsx) can opt into the
// same polish as admin tables without borrowing the admin color scheme.
export const Pagination = ({
  page,
  pages,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  variant,
}) => {
  const enhanced = variant === "admin" || Boolean(onPageSizeChange);

  // Original contract: hide entirely below 2 pages. Enhanced callers stay
  // visible whenever there's at least one result, since the "Showing X–Y of
  // Z" range and rows-per-page control are useful even on a single page —
  // but this only changes behavior for enhanced call sites, not the
  // original plain consumer usage.
  const hasSinglePage = !pages || pages <= 1;
  if (hasSinglePage && !(enhanced && total > 0)) return null;

  const effectiveSize = pageSize || 20;
  const rangeStart = total === 0 ? 0 : (page - 1) * effectiveSize + 1;
  const rangeEnd = Math.min(page * effectiveSize, total ?? Infinity);

  return (
    <Bar>
      {enhanced && typeof total === "number" ? (
        <RangeText $variant={variant}>
          Showing <strong>{rangeStart}</strong>&ndash;<strong>{rangeEnd}</strong> of <strong>{total}</strong>
        </RangeText>
      ) : (
        <RangeText $variant={variant}>
          Page {page} of {pages}
          {typeof total === "number" ? ` · ${total} total` : ""}
        </RangeText>
      )}

      <Controls>
        {onPageSizeChange && (
          <PageSizeSelect
            $variant={variant}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </PageSizeSelect>
        )}

        {pages > 1 && (
          <>
            {enhanced && (
              <StepButton
                type="button"
                $variant={variant}
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
                aria-label="First page"
              >
                <ChevronsLeft size={15} />
              </StepButton>
            )}
            <StepButton
              type="button"
              $variant={variant}
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </StepButton>
            {enhanced && (
              <PageIndicator $variant={variant}>
                {page} / {pages}
              </PageIndicator>
            )}
            <StepButton
              type="button"
              $variant={variant}
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </StepButton>
            {enhanced && (
              <StepButton
                type="button"
                $variant={variant}
                onClick={() => onPageChange(pages)}
                disabled={page >= pages}
                aria-label="Last page"
              >
                <ChevronsRight size={15} />
              </StepButton>
            )}
          </>
        )}
      </Controls>
    </Bar>
  );
};

export default Pagination;

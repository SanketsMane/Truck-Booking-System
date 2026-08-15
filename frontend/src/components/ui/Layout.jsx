import styled from "styled-components";

export const PageContainer = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(4)}
    ${({ theme }) => theme.space(10)};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding-left: ${({ theme }) => theme.space(6)};
    padding-right: ${({ theme }) => theme.space(6)};
  }
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $gap = 4 }) => theme.space($gap)};
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme, $gap = 3 }) => theme.space($gap)};
  flex-wrap: ${({ $wrap }) => ($wrap ? "wrap" : "nowrap")};
`;

export const Grid = styled.div`
  display: grid;
  gap: ${({ theme, $gap = 4 }) => theme.space($gap)};
  grid-template-columns: repeat(${({ $cols = 1 }) => $cols}, 1fr);

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    grid-template-columns: repeat(${({ $colsTablet, $cols = 1 }) => $colsTablet ?? $cols}, 1fr);
  }
`;

export const PageTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
`;

export const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
`;

export const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 14px;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.textMuted};
  border: 1px dashed ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

import styled, { css } from "styled-components";

export const Card = styled.div`
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme, $padding }) => $padding ?? theme.space(5)};
  box-shadow: ${({ theme }) => theme.shadow.card};
  transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${({ theme }) => theme.shadow.raised};
        border-color: ${({ theme }) => theme.color.borderStrong};
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

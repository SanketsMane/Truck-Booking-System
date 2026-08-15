import styled, { css } from "styled-components";

const variants = {
  primary: css`
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.onAccent};
    border: 1px solid transparent;
    box-shadow: 0 2px 6px rgba(255, 106, 26, 0.22);
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.accentStrong};
      box-shadow: ${({ theme }) => theme.shadow.accentGlow};
      transform: translateY(-1px);
    }
    &:active:not(:disabled) {
      box-shadow: 0 2px 6px rgba(255, 106, 26, 0.22);
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
    border: 1px solid ${({ theme }) => theme.color.border};
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.color.borderStrong};
      background: ${({ theme }) => theme.color.surfaceRaised};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.color.text};
    border: 1px solid transparent;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceRaised};
    }
  `,
  danger: css`
    background: transparent;
    color: ${({ theme }) => theme.color.danger};
    border: 1px solid ${({ theme }) => theme.color.danger};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.dangerSoft};
    }
  `,
};

const sizes = {
  sm: css`
    padding: 6px 12px;
    font-size: 13px;
  `,
  md: css`
    padding: 10px 18px;
    font-size: 14.5px;
  `,
  lg: css`
    padding: 13px 22px;
    font-size: 16px;
  `,
};

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease,
    transform 0.1s ease;
  white-space: nowrap;
  ${({ $variant = "primary" }) => variants[$variant]}
  ${({ $size = "md" }) => sizes[$size]}
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
`;

export default Button;

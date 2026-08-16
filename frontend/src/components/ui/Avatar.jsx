import styled from "styled-components";

const StyledAvatar = styled.div`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  font-weight: 700;
  font-size: ${({ $size }) => Math.round($size * 0.33)}px;
`;

const initials = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export const Avatar = ({ name, size = 46, ...props }) => (
  <StyledAvatar $size={size} {...props}>
    {initials(name)}
  </StyledAvatar>
);

export default Avatar;

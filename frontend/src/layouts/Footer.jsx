import styled from "styled-components";
import { Link } from "react-router-dom";

const Bar = styled.footer`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  padding: 24px 20px 100px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textFaint};
  font-size: 13px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding-bottom: 24px;
  }
`;

const Links = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  a {
    transition: color 0.15s ease;
  }

  a:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

export const Footer = () => (
  <Bar>
    <span>© {new Date().getFullYear()} ShareTruck</span>
    <Links>
      <Link to="/about">About</Link>
      <Link to="/help">Help</Link>
      <Link to="/support">Support</Link>
      <Link to="/terms">Terms</Link>
      <Link to="/privacy">Privacy</Link>
    </Links>
  </Bar>
);

export default Footer;

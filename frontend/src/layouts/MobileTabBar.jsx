import styled from "styled-components";
import { NavLink } from "react-router-dom";
import { Search, Plus, Package, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Bar = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: 0 -6px 20px rgba(20, 21, 15, 0.06);
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom));

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const Item = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textFaint};
  padding: 4px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  transition: color 0.15s ease;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.94);
  }

  &.active {
    color: ${({ theme }) => theme.color.accent};
  }
`;

const IconDot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.pill};
  transition: background 0.18s ease;

  ${Item}.active & {
    background: ${({ theme }) => theme.color.accentSoft};
  }
`;

export const MobileTabBar = () => {
  const { user } = useAuth();

  return (
    <Bar>
      <Item to="/" end>
        <IconDot>
          <Search size={19} strokeWidth={2.3} />
        </IconDot>
        Find Space
      </Item>
      {/* Always "Share Space", for every user — matches Navbar's OfferPill,
          which is likewise shown to guests/shippers/transporters alike as
          an acquisition CTA rather than gated behind an existing role. */}
      <Item to="/trips/new">
        <IconDot>
          <Plus size={19} strokeWidth={2.3} />
        </IconDot>
        Share Space
      </Item>
      <Item to={user ? "/bookings" : "/login"}>
        <IconDot>
          <Package size={19} strokeWidth={2.3} />
        </IconDot>
        Bookings
      </Item>
      <Item to={user ? "/profile" : "/login"}>
        <IconDot>
          <User size={19} strokeWidth={2.3} />
        </IconDot>
        Profile
      </Item>
    </Bar>
  );
};

export default MobileTabBar;

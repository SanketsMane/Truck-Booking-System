import { useEffect, useRef } from "react";
import styled from "styled-components";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Truck, Bell, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 14px 32px;
  }
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

const BrandMark = styled.span`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: ${({ theme }) => theme.shadow.accentGlow};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.onAccent};
`;

const Links = styled.nav`
  display: none;
  align-items: center;
  gap: 4px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: flex;
  }
`;

const NavItem = styled(NavLink)`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }

  &.active {
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const IconLink = styled(NavItem)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
`;

const UnreadBadge = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.danger};
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Navbar = () => {
  const { user, logout, unreadCount } = useAuth();
  const navigate = useNavigate();
  const barRef = useRef(null);

  // Exposes the navbar's real rendered height as a CSS var, so any
  // sticky element placed below it (e.g. the admin sidebar/top bar) can
  // offset itself correctly instead of guessing a pixel value.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return undefined;
    const setHeightVar = () => {
      document.documentElement.style.setProperty("--navbar-height", `${el.offsetHeight}px`);
    };
    setHeightVar();
    const observer = new ResizeObserver(setHeightVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <Bar ref={barRef}>
      <Brand to="/">
        <BrandMark>
          <Truck size={18} strokeWidth={2.4} />
        </BrandMark>
        ShareTruck
      </Brand>

      <Links>
        <NavItem to="/" end>
          Find Space
        </NavItem>
        {user?.roles?.includes("transporter") && (
          <>
            <NavItem to="/trips/new">Share Space</NavItem>
            <NavItem to="/trips/mine">My Trips</NavItem>
            <NavItem to="/trucks">My Trucks</NavItem>
          </>
        )}
        {user && <NavItem to="/bookings">My Bookings</NavItem>}
        {user?.isAdmin && <NavItem to="/admin">Admin</NavItem>}
      </Links>

      <Actions>
        {user ? (
          <>
            <IconLink to="/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
              <Bell size={18} strokeWidth={2.2} />
              {unreadCount > 0 && <UnreadBadge>{unreadCount > 9 ? "9+" : unreadCount}</UnreadBadge>}
            </IconLink>
            <NavItem to="/profile">{user.name?.split(" ")[0] || "Profile"}</NavItem>
            <Button $variant="ghost" $size="sm" onClick={handleLogout}>
              <LogOut size={14} strokeWidth={2.4} />
              Log out
            </Button>
          </>
        ) : (
          <Button as={Link} to="/login" $size="sm">
            Log in
          </Button>
        )}
      </Actions>
    </Bar>
  );
};

export default Navbar;

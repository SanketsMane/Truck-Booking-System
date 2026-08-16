import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, ChevronDown, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useOnClickOutside } from "../hooks/useOnClickOutside";
import { Avatar } from "../components/ui/Avatar";
import { BrandLogo } from "../components/ui/BrandLogo";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.color.surface};
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

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.text};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const BellButton = styled(IconButton)`
  position: relative;
`;

const UnreadBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
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

const OfferPill = styled(Link)`
  display: none;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1.5px solid ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accent};
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.onAccent};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: inline-flex;
  }
`;

const MenuWrap = styled.div`
  position: relative;
`;

const AvatarTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 2px;
  padding-right: 6px;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 210px;
  padding: 8px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.popover};
`;

const MenuName = styled.div`
  padding: 8px 10px 10px;
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.color.text};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  margin-bottom: 6px;
`;

const MenuItem = styled(NavLink)`
  display: block;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }

  &.active {
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const MenuButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.danger};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.dangerSoft};
  }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  margin: 6px 0;
`;

const GuestTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.text};
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    border-color: ${({ theme }) => theme.color.borderStrong};
  }
`;

const GuestMenuItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const GuestMenuHint = styled.div`
  padding: 8px 10px 10px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textMuted};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  margin-bottom: 6px;
`;

export const Navbar = () => {
  const { user, logout, unreadCount } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const barRef = useRef(null);
  const menuRef = useRef(null);
  const guestMenuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);

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

  useOnClickOutside(menuRef, () => setMenuOpen(false), menuOpen);
  useOnClickOutside(guestMenuRef, () => setGuestMenuOpen(false), guestMenuOpen);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  const isTransporter = user?.roles?.includes("transporter");

  return (
    <Bar ref={barRef}>
      <Brand to="/">
        <BrandLogo size={32} iconSize={18} />
        {platformName}
      </Brand>

      <Actions>
        <OfferPill to="/trips/new">Share Space</OfferPill>

        {user && (
          <BellButton to="/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
            <Bell size={19} strokeWidth={2.2} />
            {unreadCount > 0 && <UnreadBadge>{unreadCount > 9 ? "9+" : unreadCount}</UnreadBadge>}
          </BellButton>
        )}

        {user ? (
          <MenuWrap ref={menuRef}>
            <AvatarTrigger onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu">
              <Avatar name={user.name} size={34} />
              <ChevronDown size={15} strokeWidth={2.4} />
            </AvatarTrigger>
            {menuOpen && (
              <Menu>
                <MenuName>{user.name || "Your account"}</MenuName>
                <MenuItem to="/profile" onClick={() => setMenuOpen(false)}>
                  Profile
                </MenuItem>
                <MenuItem to="/bookings" onClick={() => setMenuOpen(false)}>
                  My Bookings
                </MenuItem>
                {isTransporter && (
                  <>
                    <MenuItem to="/trips/mine" onClick={() => setMenuOpen(false)}>
                      My Trips
                    </MenuItem>
                    <MenuItem to="/trucks" onClick={() => setMenuOpen(false)}>
                      My Trucks
                    </MenuItem>
                  </>
                )}
                {user.isAdmin && (
                  <MenuItem to="/admin" onClick={() => setMenuOpen(false)}>
                    Admin
                  </MenuItem>
                )}
                <MenuDivider />
                <MenuButton onClick={handleLogout}>
                  <LogOut size={14} strokeWidth={2.4} />
                  Log out
                </MenuButton>
              </Menu>
            )}
          </MenuWrap>
        ) : (
          <MenuWrap ref={guestMenuRef}>
            <GuestTrigger
              type="button"
              onClick={() => setGuestMenuOpen((v) => !v)}
              aria-label="Account"
              aria-expanded={guestMenuOpen}
            >
              <User size={18} strokeWidth={2.2} />
            </GuestTrigger>
            {guestMenuOpen && (
              <Menu>
                <GuestMenuHint>Log in or create an account</GuestMenuHint>
                <GuestMenuItem to="/login" onClick={() => setGuestMenuOpen(false)}>
                  <LogIn size={15} strokeWidth={2.4} />
                  Log in
                </GuestMenuItem>
                <GuestMenuItem to="/signup" onClick={() => setGuestMenuOpen(false)}>
                  <UserPlus size={15} strokeWidth={2.4} />
                  Register
                </GuestMenuItem>
              </Menu>
            )}
          </MenuWrap>
        )}
      </Actions>
    </Bar>
  );
};

export default Navbar;

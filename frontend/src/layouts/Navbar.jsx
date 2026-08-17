import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Link, NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, ChevronDown, Globe, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useOnClickOutside } from "../hooks/useOnClickOutside";
import { Avatar } from "../components/ui/Avatar";
import { BrandLogo } from "../components/ui/BrandLogo";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  background: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

// The marketing nav's own max-width/centering — separate from Bar so Bar
// itself can stay full-bleed (background + border spans the viewport) while
// the content inside is capped and centered, same pattern as PageContainer.
const Inner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1320px;
  margin: 0 auto;
  padding: 14px 20px;
  min-height: 64px;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    padding: 16px 40px;
    min-height: 80px;
  }
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

// Desktop-only wayfinding row — hidden below `desktop` in favor of the
// hamburger drawer (MobileNav), since five text links + the language
// selector + the auth button don't have room to coexist at tablet widths.
const CenterNav = styled.nav`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: flex;
    align-items: center;
    gap: 32px;
  }
`;

const CenterNavLink = styled(RouterNavLink)`
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  white-space: nowrap;
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }

  &.active {
    color: ${({ theme }) => theme.color.text};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
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

// Decorative — this app has no i18n yet, so this is a single-option menu
// (English, checked) rather than a working language switch. It's here
// because the client reference calls for it in the chrome; it doesn't
// claim to do anything it can't actually do.
const LanguageWrap = styled.div`
  position: relative;
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: block;
  }
`;

const LanguageTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const LanguageMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  padding: 6px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.popover};
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

// The primary guest CTA — a single, direct link rather than a dropdown
// (Login.jsx already offers "Create an account" from there), matching the
// client reference's one navy "Login / Sign Up" button.
const AuthCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.navy};
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: #0a2247;
  }

  &:active {
    transform: translateY(1px);
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

const Menu_ = styled.div`
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

const MenuItem = styled(RouterNavLink)`
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

const HamburgerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.text};
  flex-shrink: 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: none;
  }
`;

const MobileOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 29;
  background: rgba(15, 23, 42, 0.32);

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: none;
  }
`;

const MobileDrawer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 31;
  width: min(320px, 84vw);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.popover};
  overflow-y: auto;

  @media (min-width: ${({ theme }) => theme.breakpoint.desktop}) {
    display: none;
  }
`;

const MobileDrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const MobileDrawerClose = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.textMuted};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const MobileNavLink = styled(RouterNavLink)`
  padding: 12px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};

  &:hover,
  &.active {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

const MobileDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  margin: 10px 0;
`;

const MobileAuthCta = styled(AuthCta)`
  width: 100%;
  padding: 13px 20px;
`;

// Left-aligned so it doesn't compete with the primary "Login / Sign Up"
// button's own weight — plain text link, matches how the desktop
// header treats the language selector (secondary, low-emphasis).
const MobileLangRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13.5px;
  font-weight: 600;
`;

// Shared across desktop CenterNav and the mobile drawer — For
// Shippers/Transporters point at each audience's own primary action
// (search vs. post a trip); How it Works scrolls the home page's own
// section; About Us/Contact map onto the two closest existing public
// pages (there's no dedicated /contact page, so Help — which already
// surfaces Support — is the honest match rather than inventing a new
// route).
const NAV_LINKS = [
  { to: "/search", label: "For Shippers" },
  { to: "/trips/new", label: "For Transporters" },
  // A same-page anchor, not a distinct destination — rendered as a plain
  // Link (via the `anchor` flag below) rather than NavLink, since its
  // resolved pathname is just "/" and would otherwise show as "active"
  // any time you're on the home page at all, scrolled there or not.
  { to: "/#how-it-works", label: "How it Works", anchor: true },
  { to: "/about", label: "About Us" },
  { to: "/help", label: "Contact" },
];

export const Navbar = () => {
  const { user, logout, unreadCount } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();
  const barRef = useRef(null);
  const menuRef = useRef(null);
  const langRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
  useOnClickOutside(langRef, () => setLangOpen(false), langOpen);

  // Closing the drawer on every route change (not just an explicit tap on
  // its own X/overlay) means a nav link click doesn't leave it open behind
  // the newly-navigated page.
  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  const isTransporter = user?.roles?.includes("transporter");

  return (
    <Bar ref={barRef}>
      <Inner>
        <Brand to="/">
          <BrandLogo size={40} />
          {platformName}
        </Brand>

        <CenterNav aria-label="Main">
          {NAV_LINKS.map((link) => (
            <CenterNavLink key={link.label} to={link.to} end as={link.anchor ? Link : undefined}>
              {link.label}
            </CenterNavLink>
          ))}
        </CenterNav>

        <Actions>
          <LanguageWrap ref={langRef}>
            <LanguageTrigger
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-label="Language"
              aria-expanded={langOpen}
            >
              <Globe size={16} strokeWidth={2.2} />
              English
              <ChevronDown size={14} strokeWidth={2.4} />
            </LanguageTrigger>
            {langOpen && (
              <LanguageMenu>
                <LanguageOption>English</LanguageOption>
              </LanguageMenu>
            )}
          </LanguageWrap>

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
                <Menu_>
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
                </Menu_>
              )}
            </MenuWrap>
          ) : (
            <AuthCta to="/login">Login / Sign Up</AuthCta>
          )}

          <HamburgerButton
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={22} strokeWidth={2.2} />
          </HamburgerButton>
        </Actions>
      </Inner>

      {mobileOpen && (
        <>
          <MobileOverlay onClick={() => setMobileOpen(false)} />
          <MobileDrawer role="dialog" aria-modal="true" aria-label="Menu">
            <MobileDrawerHeader>
              <Brand to="/" onClick={() => setMobileOpen(false)}>
                <BrandLogo size={32} />
                {platformName}
              </Brand>
              <MobileDrawerClose onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} strokeWidth={2.2} />
              </MobileDrawerClose>
            </MobileDrawerHeader>

            {NAV_LINKS.map((link) => (
              <MobileNavLink
                key={link.label}
                to={link.to}
                end
                as={link.anchor ? Link : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </MobileNavLink>
            ))}

            <MobileLangRow>
              <Globe size={16} strokeWidth={2.2} />
              English
            </MobileLangRow>

            <MobileDivider />

            {user ? (
              <>
                <MobileNavLink to="/profile" onClick={() => setMobileOpen(false)}>
                  Profile
                </MobileNavLink>
                <MobileNavLink to="/bookings" onClick={() => setMobileOpen(false)}>
                  My Bookings
                </MobileNavLink>
                {isTransporter && (
                  <>
                    <MobileNavLink to="/trips/mine" onClick={() => setMobileOpen(false)}>
                      My Trips
                    </MobileNavLink>
                    <MobileNavLink to="/trucks" onClick={() => setMobileOpen(false)}>
                      My Trucks
                    </MobileNavLink>
                  </>
                )}
                {user.isAdmin && (
                  <MobileNavLink to="/admin" onClick={() => setMobileOpen(false)}>
                    Admin
                  </MobileNavLink>
                )}
                <MobileDivider />
                <MenuButton onClick={handleLogout}>
                  <LogOut size={14} strokeWidth={2.4} />
                  Log out
                </MenuButton>
              </>
            ) : (
              <MobileAuthCta to="/login" onClick={() => setMobileOpen(false)}>
                Login / Sign Up
              </MobileAuthCta>
            )}
          </MobileDrawer>
        </>
      )}
    </Bar>
  );
};

export default Navbar;

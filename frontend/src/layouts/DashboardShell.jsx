import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { Truck, Bell, LogOut, PanelLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { theme } from "../theme/theme";

const SIDEBAR_WIDTH = 236;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TOPBAR_HEIGHT = 60;

const Shell = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.surface};
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  height: ${TOPBAR_HEIGHT}px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  background: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 0 22px;
  }
`;

const FoldButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  flex: none;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.text};
`;

const BrandMark = styled.span`
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: ${({ theme }) => theme.shadow.accentGlow};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.onAccent};
`;

const BrandTag = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const TopBarSpacer = styled.div`
  flex: 1;
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const IconLinkButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const UserName = styled.span`
  display: none;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  padding: 0 2px;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: inline;
  }
`;

const LogoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px 7px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13.5px;
  font-weight: 600;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Body = styled.div`
  display: flex;
  align-items: flex-start;
`;

const Backdrop = styled.div`
  display: ${({ $open }) => ($open ? "block" : "none")};
  position: fixed;
  inset: 0;
  top: ${TOPBAR_HEIGHT}px;
  background: rgba(20, 21, 15, 0.4);
  z-index: 25;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const Sidebar = styled.aside`
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 10px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-right: 1px solid ${({ theme }) => theme.color.border};
  overflow-y: auto;

  position: fixed;
  top: ${TOPBAR_HEIGHT}px;
  bottom: 0;
  left: 0;
  width: ${SIDEBAR_WIDTH}px;
  z-index: 26;
  transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? "0" : "-100%")});
  transition: transform 0.2s ease;
  box-shadow: ${({ theme }) => theme.shadow.popover};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    position: sticky;
    height: calc(100vh - ${TOPBAR_HEIGHT}px);
    width: ${({ $collapsed }) => ($collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH)}px;
    transform: none;
    transition: width 0.18s ease;
    box-shadow: none;
    z-index: 5;
  }
`;

const NavSectionLabel = styled.div`
  padding: 4px 12px 8px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${({ theme }) => theme.color.textFaint};
`;

const NavItem = styled(NavLink)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px 9px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  transition: background 0.15s ease, color 0.15s ease;

  svg {
    flex: none;
  }

  &:hover {
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
  }

  &.active {
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.accentStrong};
    box-shadow: 0 1px 2px rgba(20, 21, 15, 0.06);
  }

  &.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.accent};
  }
`;

const Content = styled.main`
  flex: 1;
  min-width: 0;
`;

// The shared shell behind every role's dashboard (admin today, shipper/
// transporter via DashboardLayout) — a dedicated app-shell with its own
// top bar (brand, notifications, logout) and a collapsible/slide-in sidebar
// driven entirely by the `nav` prop, so each role supplies its own link
// list without duplicating ~250 lines of layout code per role.
export const DashboardShell = ({ nav, storageKey, brandTo = "/", tag, navSectionLabel = "Menu" }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed, storageKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // One toggle button, one behavior per viewport — avoids ever rendering
  // two separate fold controls that both claim to do the same thing.
  const handleToggle = () => {
    const isDesktop = window.matchMedia(`(min-width: ${theme.breakpoint.tablet})`).matches;
    if (isDesktop) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <Shell>
      <TopBar>
        <FoldButton type="button" onClick={handleToggle} aria-label="Toggle sidebar">
          <PanelLeft size={18} />
        </FoldButton>
        <Brand to={brandTo}>
          <BrandMark>
            <Truck size={15} strokeWidth={2.4} />
          </BrandMark>
          ShareTruck
          {tag && <BrandTag>{tag}</BrandTag>}
        </Brand>

        <TopBarSpacer />

        <TopBarActions>
          <IconLinkButton to="/notifications" aria-label="Notifications">
            <Bell size={17} strokeWidth={2.2} />
          </IconLinkButton>
          <UserName>{user?.name || "Account"}</UserName>
          <LogoutButton type="button" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={2.4} />
            Log out
          </LogoutButton>
        </TopBarActions>
      </TopBar>

      <Body>
        <Backdrop $open={mobileOpen} onClick={() => setMobileOpen(false)} />

        <Sidebar $collapsed={collapsed} $mobileOpen={mobileOpen}>
          {!collapsed && <NavSectionLabel>{navSectionLabel}</NavSectionLabel>}
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavItem key={item.to} to={item.to} end={item.end} title={item.label}>
                <Icon size={18} strokeWidth={2.2} />
                {!collapsed && <span>{item.label}</span>}
              </NavItem>
            );
          })}
        </Sidebar>

        <Content>
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </Body>
    </Shell>
  );
};

export default DashboardShell;

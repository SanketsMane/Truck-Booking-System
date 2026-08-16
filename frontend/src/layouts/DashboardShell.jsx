import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { Bell, LogOut, PanelLeftClose, PanelLeftOpen, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useOnClickOutside } from "../hooks/useOnClickOutside";
import { Avatar } from "../components/ui/Avatar";
import { BrandLogo } from "../components/ui/BrandLogo";
import ErrorBoundary from "../components/ErrorBoundary";
import { theme } from "../theme/theme";

const SIDEBAR_WIDTH = 236;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const TOPBAR_HEIGHT = 60;


// ===== Admin variant =====
// A visually distinct shell for the admin console (navy sidebar that owns
// its own branding/collapse control, plus a separate top header carrying
// page context and the account menu) — deliberately a second render path
// rather than new props threaded through the styles above, so the
// shipper/transporter shell (the default path, still rendered exactly as
// before) can't regress from an admin-focused redesign.
const AdminRoot = styled.div`
  min-height: 100vh;
  display: flex;
  background: ${({ theme }) => theme.admin.color.bg};
`;

const AdminSidebar = styled.aside`
  flex: none;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.admin.color.navy};
  border-right: 1px solid ${({ theme }) => theme.admin.color.navyBorder};

  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${SIDEBAR_WIDTH}px;
  z-index: 40;
  transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? "0" : "-100%")});
  transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.easing};
  box-shadow: ${({ theme }) => theme.admin.shadow.popover};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    position: sticky;
    height: 100vh;
    width: ${({ $collapsed }) => ($collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH)}px;
    transform: none;
    transition: width ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.easing};
    box-shadow: none;
    z-index: 10;
  }
`;

// Row layout (icon, text, toggle side by side) at full width. At the
// collapsed rail width (72px) that row can't fit the brand icon (32px) +
// toggle button (28px) + padding side by side without clipping — so past
// the tablet breakpoint, a collapsed sidebar switches this header to a
// centered column instead, stacking icon above toggle.
const AdminSidebarHeader = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: ${TOPBAR_HEIGHT}px;
  padding: 0 14px;
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.navyBorder};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-direction: ${({ $collapsed }) => ($collapsed ? "column" : "row")};
    justify-content: center;
    padding: ${({ $collapsed }) => ($collapsed ? "12px 8px" : "0 14px")};
  }
`;

const AdminBrandText = styled.div`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;

  strong {
    display: block;
    font-size: 14.5px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: #fff;
  }

  span {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.admin.color.navyTextMuted};
  }
`;

const AdminCollapseButton = styled.button`
  margin-left: auto;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  color: ${({ theme }) => theme.admin.color.navyTextMuted};
  transition: background ${({ theme }) => theme.motion.fast} ease, color ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  @media (max-width: calc(${({ theme }) => theme.breakpoint.tablet} - 1px)) {
    display: none;
  }

  // In the collapsed column layout the header centers its children on the
  // cross axis already — auto margin-left only makes sense in the row
  // layout, where it pushes the toggle to the header's right edge.
  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    margin-left: ${({ $collapsed }) => ($collapsed ? "0" : "auto")};
  }
`;

const AdminSidebarClose = styled(AdminCollapseButton)`
  display: inline-flex;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const AdminNav = styled.nav`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const AdminNavSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AdminNavLabel = styled.div`
  padding: 0 12px 6px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(148, 163, 184, 0.7);
  white-space: nowrap;
`;

const AdminNavItem = styled(NavLink)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  color: ${({ theme }) => theme.admin.color.navyTextMuted};
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  transition: background 0.15s ease, color 0.15s ease;

  svg {
    flex: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.admin.color.primary};
    outline-offset: 2px;
  }

  &.active {
    background: ${({ theme }) => theme.admin.color.primary};
    color: #fff;
  }
`;

const AdminBackdrop = styled.div`
  display: ${({ $open }) => ($open ? "block" : "none")};
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 39;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const AdminMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const AdminTopHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  height: ${TOPBAR_HEIGHT}px;
  padding: 0 16px;
  background: ${({ theme }) => theme.admin.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 0 24px;
  }
`;

const AdminMenuButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  color: ${({ theme }) => theme.admin.color.textSecondary};
  flex: none;

  &:hover {
    background: ${({ theme }) => theme.admin.color.bg};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const AdminPageTitle = styled.div`
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: ${({ theme }) => theme.admin.color.text};
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  p {
    margin: 1px 0 0;
    font-size: 12.5px;
    color: ${({ theme }) => theme.admin.color.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const AdminHeaderSpacer = styled.div`
  flex: 1;
`;

const AdminHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
`;

const AdminIconButton = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  color: ${({ theme }) => theme.admin.color.textSecondary};

  &:hover {
    background: ${({ theme }) => theme.admin.color.bg};
    color: ${({ theme }) => theme.admin.color.text};
  }
`;

const AdminUnreadBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background: ${({ theme }) => theme.admin.color.danger};
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
`;

const AdminUserMenuWrap = styled.div`
  position: relative;
  margin-left: 4px;
`;

const AdminUserTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.admin.color.bg};
    border-color: ${({ theme }) => theme.admin.color.border};
  }
`;

const AdminUserMeta = styled.div`
  display: none;
  text-align: left;
  line-height: 1.25;

  strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.admin.color.text};
  }

  span {
    display: block;
    font-size: 11px;
    color: ${({ theme }) => theme.admin.color.textSecondary};
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: block;
  }
`;

const AdminUserMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 190px;
  padding: 6px;
  background: ${({ theme }) => theme.admin.color.surface};
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.admin.radius.card};
  box-shadow: ${({ theme }) => theme.admin.shadow.popover};
  z-index: 30;
`;

const AdminUserMenuHint = styled.div`
  padding: 6px 10px 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.admin.color.textSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.border};
  margin-bottom: 4px;
`;

const AdminUserMenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.admin.radius.control};
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.admin.color.danger};

  &:hover {
    background: ${({ theme }) => theme.admin.color.dangerSoft};
  }
`;

// No padding here — every admin page already renders its own PageContainer
// (with its own padding/max-width, some overridden per page). Adding
// padding at this level would double up against that.
const AdminContent = styled.main`
  flex: 1;
  min-width: 0;
`;

// ===== Dashboard variant (shipper/transporter) =====
// Same shell architecture as the admin variant above (sidebar owns its own
// branding + collapse control, a separate top header carries page context
// + account menu, grouped nav sections) — but on the consumer palette
// (theme.color.*, light surfaces, blue accent) instead of the admin navy,
// since this is a marketplace user's own dashboard, not an enterprise
// console. DashboardLayout is this variant's only caller.
const DashRoot = styled.div`
  min-height: 100vh;
  display: flex;
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const DashSidebar = styled.aside`
  flex: none;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.surface};
  border-right: 1px solid ${({ theme }) => theme.color.border};

  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${SIDEBAR_WIDTH}px;
  z-index: 40;
  transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? "0" : "-100%")});
  transition: transform ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.easing};
  box-shadow: ${({ theme }) => theme.shadow.popover};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    position: sticky;
    height: 100vh;
    width: ${({ $collapsed }) => ($collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH)}px;
    transform: none;
    transition: width ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.easing};
    box-shadow: none;
    z-index: 10;
  }
`;

const DashSidebarHeader = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: ${TOPBAR_HEIGHT}px;
  padding: 0 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-direction: ${({ $collapsed }) => ($collapsed ? "column" : "row")};
    justify-content: center;
    padding: ${({ $collapsed }) => ($collapsed ? "12px 8px" : "0 14px")};
  }
`;

const DashBrandText = styled.div`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;

  strong {
    display: block;
    font-size: 14.5px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.color.text};
  }

  span {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const DashCollapseButton = styled.button`
  margin-left: auto;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  transition: background ${({ theme }) => theme.motion.fast} ease, color ${({ theme }) => theme.motion.fast} ease;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }

  @media (max-width: calc(${({ theme }) => theme.breakpoint.tablet} - 1px)) {
    display: none;
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    margin-left: ${({ $collapsed }) => ($collapsed ? "0" : "auto")};
  }
`;

const DashSidebarClose = styled(DashCollapseButton)`
  display: inline-flex;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const DashNav = styled.nav`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const DashNavSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DashNavLabel = styled.div`
  padding: 0 12px 6px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${({ theme }) => theme.color.textFaint};
  white-space: nowrap;
`;

const DashNavItem = styled(NavLink)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  transition: background 0.15s ease, color 0.15s ease;

  svg {
    flex: none;
  }

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accent};
    outline-offset: 2px;
  }

  &.active {
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accentStrong};
  }
`;

const DashNavItemLabel = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DashNavItemBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.onAccent};
  font-size: 10.5px;
  font-weight: 700;
`;

const DashBackdrop = styled.div`
  display: ${({ $open }) => ($open ? "block" : "none")};
  position: fixed;
  inset: 0;
  background: rgba(20, 21, 15, 0.4);
  z-index: 39;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const DashMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const DashTopHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  height: ${TOPBAR_HEIGHT}px;
  padding: 0 16px;
  background: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: 0 24px;
  }
`;

const DashMenuButton = styled.button`
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
  }

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: none;
  }
`;

const DashPageTitle = styled.div`
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const DashHeaderSpacer = styled.div`
  flex: 1;
`;

const DashHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
`;

const DashIconButton = styled(Link)`
  position: relative;
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

const DashUnreadBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
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

const DashUserMenuWrap = styled.div`
  position: relative;
  margin-left: 4px;
`;

const DashUserTrigger = styled.button`
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

const DashUserMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 200px;
  padding: 8px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.popover};
  z-index: 30;
`;

const DashUserMenuName = styled.div`
  padding: 8px 10px 10px;
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.color.text};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  margin-bottom: 6px;
`;

const DashUserMenuItem = styled(NavLink)`
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
`;

const DashUserMenuDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  margin: 6px 0;
`;

const DashUserMenuLogout = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.danger};

  &:hover {
    background: ${({ theme }) => theme.color.dangerSoft};
  }
`;

// No padding here — every dashboard page already renders its own
// PageContainer, same reasoning as AdminContent above.
const DashContent = styled.main`
  flex: 1;
  min-width: 0;
`;

// The shared shell behind every role's dashboard (admin today, shipper/
// transporter via DashboardLayout) — a dedicated app-shell with its own
// top bar (brand, notifications, logout) and a collapsible/slide-in sidebar
// driven entirely by the `nav` prop, so each role supplies its own link
// list without duplicating ~250 lines of layout code per role.
export const DashboardShell = ({ nav, storageKey, brandTo = "/", tag, variant }) => {
  const { pathname } = useLocation();
  const { user, logout, unreadCount } = useAuth();
  const { platformName } = useBranding();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed, storageKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Admin's mobile drawer covers the full screen over real page content
  // (unlike the default shell's sidebar, which pushes rather than
  // overlays) — lock body scroll while it's open so the page behind it
  // doesn't scroll along with it.
  useEffect(() => {
    if (variant !== "admin" || !mobileOpen) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [variant, mobileOpen]);

  useOnClickOutside(userMenuRef, () => setUserMenuOpen(false), userMenuOpen);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Both variants receive `nav` as grouped sections ([{ label, items }]) —
  // used to render the nav itself and, by matching the current pathname
  // against it, to derive the top header's page title automatically. No
  // admin/dashboard page needs to know about the shell or pass its own
  // title down.
  const sections = nav;
  const flatItems = sections.flatMap((s) => s.items);
  const activeItem =
    flatItems.find((i) => pathname === i.to) ||
    flatItems.filter((i) => !i.end && pathname.startsWith(i.to)).sort((a, b) => b.to.length - a.to.length)[0];
  const pageTitle = activeItem?.label || tag || "Dashboard";
  const pageDescription = activeItem?.description;

  if (variant === "admin") {
    return (
      <AdminRoot>
        <AdminBackdrop $open={mobileOpen} onClick={() => setMobileOpen(false)} />

        <AdminSidebar $collapsed={collapsed} $mobileOpen={mobileOpen}>
          <AdminSidebarHeader $collapsed={collapsed}>
            <BrandLogo
              size={32}
              iconSize={16}
              background={theme.admin.color.primary}
              radius={theme.admin.radius.control}
              iconColor="#fff"
              glow="none"
            />
            {!collapsed && (
              <AdminBrandText>
                <strong>{platformName}</strong>
                <span>Admin Console</span>
              </AdminBrandText>
            )}
            <AdminCollapseButton
              type="button"
              $collapsed={collapsed}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </AdminCollapseButton>
            <AdminSidebarClose type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={18} />
            </AdminSidebarClose>
          </AdminSidebarHeader>

          <AdminNav>
            {sections.map((section) => (
              <AdminNavSection key={section.label}>
                {!collapsed && <AdminNavLabel>{section.label}</AdminNavLabel>}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <AdminNavItem key={item.to} to={item.to} end={item.end} title={item.label}>
                      <Icon size={17} strokeWidth={2.2} />
                      {!collapsed && <span>{item.label}</span>}
                    </AdminNavItem>
                  );
                })}
              </AdminNavSection>
            ))}
          </AdminNav>
        </AdminSidebar>

        <AdminMain>
          <AdminTopHeader>
            <AdminMenuButton type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </AdminMenuButton>

            <AdminPageTitle>
              <h1>{pageTitle}</h1>
              {pageDescription && <p>{pageDescription}</p>}
            </AdminPageTitle>

            <AdminHeaderSpacer />

            <AdminHeaderActions>
              <AdminIconButton
                to="/notifications"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              >
                <Bell size={18} strokeWidth={2.2} />
                {unreadCount > 0 && <AdminUnreadBadge>{unreadCount > 9 ? "9+" : unreadCount}</AdminUnreadBadge>}
              </AdminIconButton>

              <AdminUserMenuWrap ref={userMenuRef}>
                <AdminUserTrigger
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Account menu"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar name={user?.name} size={28} />
                  <AdminUserMeta>
                    <strong>{user?.name || "Admin"}</strong>
                    <span>Administrator</span>
                  </AdminUserMeta>
                  <ChevronDown size={14} strokeWidth={2.4} />
                </AdminUserTrigger>
                {userMenuOpen && (
                  <AdminUserMenu>
                    <AdminUserMenuHint>{user?.email || "Signed in"}</AdminUserMenuHint>
                    <AdminUserMenuItem type="button" onClick={handleLogout}>
                      <LogOut size={14} strokeWidth={2.4} />
                      Log out
                    </AdminUserMenuItem>
                  </AdminUserMenu>
                )}
              </AdminUserMenuWrap>
            </AdminHeaderActions>
          </AdminTopHeader>

          <AdminContent>
            <ErrorBoundary resetKey={pathname}>
              <Outlet />
            </ErrorBoundary>
          </AdminContent>
        </AdminMain>
      </AdminRoot>
    );
  }

  return (
    <DashRoot>
      <DashBackdrop $open={mobileOpen} onClick={() => setMobileOpen(false)} />

      <DashSidebar $collapsed={collapsed} $mobileOpen={mobileOpen}>
        <DashSidebarHeader $collapsed={collapsed}>
          <BrandLogo size={32} iconSize={16} />
          {!collapsed && (
            <DashBrandText>
              <strong>{platformName}</strong>
              <span>Dashboard</span>
            </DashBrandText>
          )}
          <DashCollapseButton
            type="button"
            $collapsed={collapsed}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </DashCollapseButton>
          <DashSidebarClose type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </DashSidebarClose>
        </DashSidebarHeader>

        <DashNav>
          {sections.map((section) => (
            <DashNavSection key={section.label}>
              {!collapsed && <DashNavLabel>{section.label}</DashNavLabel>}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <DashNavItem key={item.to} to={item.to} end={item.end} title={item.label}>
                    <Icon size={17} strokeWidth={2.2} />
                    {!collapsed && <DashNavItemLabel>{item.label}</DashNavItemLabel>}
                    {item.badge > 0 && <DashNavItemBadge>{item.badge > 9 ? "9+" : item.badge}</DashNavItemBadge>}
                  </DashNavItem>
                );
              })}
            </DashNavSection>
          ))}
        </DashNav>
      </DashSidebar>

      <DashMain>
        <DashTopHeader>
          <DashMenuButton type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </DashMenuButton>

          <DashPageTitle>
            <h1>{pageTitle}</h1>
          </DashPageTitle>

          <DashHeaderSpacer />

          <DashHeaderActions>
            <DashIconButton
              to="/notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            >
              <Bell size={18} strokeWidth={2.2} />
              {unreadCount > 0 && <DashUnreadBadge>{unreadCount > 9 ? "9+" : unreadCount}</DashUnreadBadge>}
            </DashIconButton>

            <DashUserMenuWrap ref={userMenuRef}>
              <DashUserTrigger
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                aria-expanded={userMenuOpen}
              >
                <Avatar name={user?.name} size={30} />
                <ChevronDown size={14} strokeWidth={2.4} />
              </DashUserTrigger>
              {userMenuOpen && (
                <DashUserMenu>
                  <DashUserMenuName>{user?.name || brandTo}</DashUserMenuName>
                  <DashUserMenuItem to="/profile" onClick={() => setUserMenuOpen(false)}>
                    Profile
                  </DashUserMenuItem>
                  <DashUserMenuDivider />
                  <DashUserMenuLogout type="button" onClick={handleLogout}>
                    <LogOut size={14} strokeWidth={2.4} />
                    Log out
                  </DashUserMenuLogout>
                </DashUserMenu>
              )}
            </DashUserMenuWrap>
          </DashHeaderActions>
        </DashTopHeader>

        <DashContent>
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </DashContent>
      </DashMain>
    </DashRoot>
  );
};

export default DashboardShell;

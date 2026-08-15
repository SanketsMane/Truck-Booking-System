import { useMemo } from "react";
import {
  Search,
  Package,
  Wallet as WalletIcon,
  User,
  LifeBuoy,
  Truck,
  Plus,
  Route as RouteIcon,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DashboardShell from "./DashboardShell";

const BASE_NAV = [
  { to: "/", label: "Find Space", icon: Search, end: true },
  { to: "/bookings", label: "My Bookings", icon: Package },
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/disputes", label: "Disputes", icon: ScrollText },
];

const TRANSPORTER_NAV = [
  { to: "/trucks", label: "My Trucks", icon: Truck },
  { to: "/trips/new", label: "Post a Trip", icon: Plus },
  { to: "/trips/mine", label: "My Trips", icon: RouteIcon },
];

const ADMIN_NAV = [{ to: "/admin", label: "Admin panel", icon: ShieldCheck }];

// Shipper/transporter dashboard shell — same DashboardShell as admin, but
// with an adaptive nav list rather than a fixed one: `roles` is an array,
// so a dual-role user needs both sections at once rather than picking a
// separate ShipperLayout vs TransporterLayout. MyBookings.jsx already
// internally tabs "As Shipper"/"As Transporter", so the nav only ever
// needs one /bookings entry either way. An admin who is also a shipper/
// transporter otherwise has no way back to /admin from inside this shell
// (the public Navbar's "Admin" link isn't rendered here) — one extra entry
// closes that dead end.
export const DashboardLayout = () => {
  const { user } = useAuth();
  const isTransporter = Boolean(user?.roles?.includes("transporter"));

  const nav = useMemo(() => {
    const base = isTransporter ? [...TRANSPORTER_NAV, ...BASE_NAV] : BASE_NAV;
    return user?.isAdmin ? [...base, ...ADMIN_NAV] : base;
  }, [isTransporter, user?.isAdmin]);

  return <DashboardShell nav={nav} storageKey="dashboard-sidebar-collapsed" brandTo="/" />;
};

export default DashboardLayout;

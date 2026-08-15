import {
  LayoutDashboard,
  ShieldCheck,
  Users as UsersIcon,
  Truck as TruckIcon,
  Route as RouteIcon,
  Package,
  CreditCard,
  Wallet as WalletIcon,
  Banknote,
  MapPin,
  Star,
  LifeBuoy,
  ScrollText,
  Settings as SettingsIcon,
} from "lucide-react";
import DashboardShell from "./DashboardShell";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { to: "/admin/users", label: "Users", icon: UsersIcon },
  { to: "/admin/trucks", label: "Trucks", icon: TruckIcon },
  { to: "/admin/trips", label: "Trips", icon: RouteIcon },
  { to: "/admin/bookings", label: "Bookings", icon: Package },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/platform-wallet", label: "Platform Wallet", icon: WalletIcon },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/admin/live-tracking", label: "Live Tracking", icon: MapPin },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/disputes", label: "Disputes", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

// Admin gets its own dedicated shell — no consumer navbar, no shipper/
// transporter nav links, no marketing footer. An admin account manages the
// platform; it isn't also acting as a shipper or transporter.
export const AdminLayout = () => (
  <DashboardShell nav={NAV} storageKey="admin-sidebar-collapsed" brandTo="/admin" tag="Admin" />
);

export default AdminLayout;

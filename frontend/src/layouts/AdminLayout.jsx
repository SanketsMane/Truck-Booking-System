import {
  LayoutDashboard,
  ShieldCheck,
  Users as UsersIcon,
  Truck as TruckIcon,
  Route as RouteIcon,
  Package,
  Star,
  LifeBuoy,
  AlertTriangle,
  Settings as SettingsIcon,
  FileClock,
} from "lucide-react";
import DashboardShell from "./DashboardShell";

// Grouped the way an operator actually thinks about the platform — not an
// alphabetical dump of every route. Each item's `description` becomes the
// admin top header's contextual subtitle (DashboardShell derives the page
// title/description by matching the current route against this config, so
// no admin page needs to know about the shell at all).
const NAV = [
  {
    label: "Main",
    items: [
      {
        to: "/admin",
        label: "Dashboard",
        description: "Platform overview and key metrics",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        to: "/admin/verification",
        label: "Verification",
        description: "KYC and document review queue",
        icon: ShieldCheck,
      },
      { to: "/admin/users", label: "Users", description: "Shippers and transporters", icon: UsersIcon },
      { to: "/admin/trucks", label: "Trucks", description: "Registered fleet vehicles", icon: TruckIcon },
      { to: "/admin/trips", label: "Trips", description: "Posted capacity across the network", icon: RouteIcon },
      { to: "/admin/bookings", label: "Bookings", description: "Shipment bookings and status", icon: Package },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { to: "/admin/reviews", label: "Reviews", description: "Flagged ratings and moderation", icon: Star },
      { to: "/admin/support", label: "Support", description: "Open support requests", icon: LifeBuoy },
      { to: "/admin/disputes", label: "Disputes", description: "Booking disputes awaiting resolution", icon: AlertTriangle },
    ],
  },
  {
    label: "System",
    items: [
      {
        to: "/admin/settings",
        label: "Settings",
        description: "Platform configuration and integrations",
        icon: SettingsIcon,
      },
      {
        to: "/admin/audit-logs",
        label: "Audit Log",
        description: "Admin action history",
        icon: FileClock,
      },
    ],
  },
];

// Admin gets its own dedicated shell — no consumer navbar, no shipper/
// transporter nav links, no marketing footer. An admin account manages the
// platform; it isn't also acting as a shipper or transporter.
export const AdminLayout = () => (
  <DashboardShell nav={NAV} storageKey="admin-sidebar-collapsed" brandTo="/admin" variant="admin" />
);

export default AdminLayout;

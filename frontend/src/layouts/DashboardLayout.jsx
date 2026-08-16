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

// Shipper/transporter dashboard shell — same DashboardShell as admin, but
// with an adaptive, grouped nav rather than a fixed one: `roles` is an
// array, so a dual-role user needs both sections at once rather than
// picking a separate ShipperLayout vs TransporterLayout. MyBookings.jsx
// already internally tabs "As Shipper"/"As Transporter", so the nav only
// ever needs one /bookings entry either way. An admin who is also a
// shipper/transporter otherwise has no way back to /admin from inside this
// shell (the public Navbar's "Admin" link isn't rendered here) — one extra
// entry closes that dead end.
export const DashboardLayout = () => {
  const { user } = useAuth();
  const isTransporter = Boolean(user?.roles?.includes("transporter"));

  const nav = useMemo(() => {
    const sections = [
      {
        label: "Marketplace",
        items: [{ to: "/", label: "Find Space", description: "Search truck capacity", icon: Search, end: true }],
      },
    ];

    if (isTransporter) {
      sections.push({
        label: "Fleet",
        items: [
          { to: "/trucks", label: "My Trucks", description: "Registered vehicles", icon: Truck },
          { to: "/trips/new", label: "Post a Trip", description: "List spare capacity", icon: Plus },
          { to: "/trips/mine", label: "My Trips", description: "Trips you've posted", icon: RouteIcon },
        ],
      });
    }

    sections.push({
      label: "Account",
      items: [
        { to: "/bookings", label: "My Bookings", description: "Your booking history", icon: Package },
        { to: "/wallet", label: "Wallet", description: "Balance and transactions", icon: WalletIcon },
        { to: "/profile", label: "Profile", description: "Account details", icon: User },
      ],
    });

    sections.push({
      label: "Support",
      items: [
        { to: "/support", label: "Support", description: "Get help from our team", icon: LifeBuoy },
        { to: "/disputes", label: "Disputes", description: "Booking disputes", icon: ScrollText },
      ],
    });

    if (user?.isAdmin) {
      sections.push({
        label: "System",
        items: [{ to: "/admin", label: "Admin panel", description: "Platform administration", icon: ShieldCheck }],
      });
    }

    return sections;
  }, [isTransporter, user?.isAdmin]);

  return <DashboardShell nav={nav} storageKey="dashboard-sidebar-collapsed" brandTo="/" />;
};

export default DashboardLayout;

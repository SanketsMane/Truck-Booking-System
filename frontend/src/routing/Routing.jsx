import { Route, Routes } from "react-router-dom";
import Layout from "../layouts/Layout";
import DashboardLayout from "../layouts/DashboardLayout";
import AdminLayout from "../layouts/AdminLayout";
import { RequireAuth, RequireRole, RequireAdmin } from "./guards";

import Home from "../pages/Home";
import SearchResults from "../pages/SearchResults";
import TripDetail from "../pages/TripDetail";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import About from "../pages/About";
import Help from "../pages/Help";
import Terms from "../pages/Terms";
import Privacy from "../pages/Privacy";
import NotFound from "../pages/NotFound";

import Profile from "../pages/Profile";
import Notifications from "../pages/Notifications";
import MyBookings from "../pages/MyBookings";
import BookingDetail from "../pages/BookingDetail";
import Support from "../pages/Support";
import Disputes from "../pages/Disputes";
import Wallet from "../pages/Wallet";

import MyTrucks from "../pages/MyTrucks";
import PostTrip from "../pages/PostTrip";
import MyTrips from "../pages/MyTrips";
import ManageTrip from "../pages/ManageTrip";

import AdminDashboard from "../pages/admin/Dashboard";
import AdminVerificationQueue from "../pages/admin/VerificationQueue";
import AdminUsers from "../pages/admin/Users";
import AdminUserDetail from "../pages/admin/UserDetail";
import AdminTrucks from "../pages/admin/Trucks";
import AdminTrips from "../pages/admin/Trips";
import AdminBookings from "../pages/admin/Bookings";
import AdminPayments from "../pages/admin/Payments";
import AdminPlatformWallet from "../pages/admin/PlatformWallet";
import AdminWithdrawals from "../pages/admin/Withdrawals";
import AdminLiveTracking from "../pages/admin/LiveTracking";
import AdminReviews from "../pages/admin/Reviews";
import AdminSupport from "../pages/admin/Support";
import AdminDisputes from "../pages/admin/Disputes";
import AdminSettings from "../pages/admin/Settings";

export const Routing = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/trips/:id" element={<TripDetail />} />
      <Route path="/about" element={<About />} />
      <Route path="/help" element={<Help />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      <Route path="*" element={<NotFound />} />
    </Route>

    {/* Auth pages get their own full-screen shell (AuthShell) — same
        "not nested under the consumer Layout" reasoning as everything
        else below: a login form belongs on its own deliberate screen, not
        squeezed between the marketing navbar and footer. */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Shipper/transporter private pages get their own dashboard shell
        (DashboardLayout) — same "not nested under the consumer Layout"
        pattern as Admin below, so the dashboard's own sidebar+topbar is
        the only chrome around them instead of stacking under the public
        marketing navbar/footer/mobile tab bar too. */}
    <Route element={<RequireAuth />}>
      <Route element={<DashboardLayout />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/support" element={<Support />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/wallet" element={<Wallet />} />
      </Route>
    </Route>

    <Route element={<RequireRole role="transporter" />}>
      <Route element={<DashboardLayout />}>
        <Route path="/trucks" element={<MyTrucks />} />
        <Route path="/trips/new" element={<PostTrip />} />
        <Route path="/trips/mine" element={<MyTrips />} />
        <Route path="/trips/:id/manage" element={<ManageTrip />} />
      </Route>
    </Route>

    {/* Admin gets its own dedicated shell (AdminLayout) — deliberately NOT
        nested under the consumer Layout, so admins never see the consumer
        navbar/footer or shipper/transporter nav links. An admin account
        manages the platform; it isn't also a shipper or transporter. */}
    <Route element={<RequireAdmin />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/verification" element={<AdminVerificationQueue />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        <Route path="/admin/trucks" element={<AdminTrucks />} />
        <Route path="/admin/trips" element={<AdminTrips />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/platform-wallet" element={<AdminPlatformWallet />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
        <Route path="/admin/live-tracking" element={<AdminLiveTracking />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/admin/disputes" element={<AdminDisputes />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>
    </Route>
  </Routes>
);

export default Routing;

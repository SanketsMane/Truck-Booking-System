import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import styled from "styled-components";
import Layout from "../layouts/Layout";
import DashboardLayout from "../layouts/DashboardLayout";
import AdminLayout from "../layouts/AdminLayout";
import { RequireAuth, RequireRole, RequireAdmin } from "./guards";
import { TruckLoader } from "../components/ui/TruckLoader";

// Home is eager — it's the app's entry point/LCP page, so it should never
// wait on a lazy-chunk round trip. Every other route is code-split by
// shell: each shell already wraps its routes with its own chrome (navbar,
// dashboard sidebar, admin sidebar), so one Suspense boundary per shell is
// the natural place to show a loading state without the chrome itself
// flashing/remounting between route transitions.
import Home from "../pages/Home";

const SuspenseFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 0;
`;

const RouteFallback = () => (
  <SuspenseFallback>
    <TruckLoader $size={40} />
  </SuspenseFallback>
);

const SearchResults = lazy(() => import("../pages/SearchResults"));
const TripDetail = lazy(() => import("../pages/TripDetail"));
const About = lazy(() => import("../pages/About"));
const ForShippers = lazy(() => import("../pages/ForShippers"));
const Help = lazy(() => import("../pages/Help"));
const Faq = lazy(() => import("../pages/Faq"));
const Terms = lazy(() => import("../pages/Terms"));
const Privacy = lazy(() => import("../pages/Privacy"));
const NotFound = lazy(() => import("../pages/NotFound"));

const PostList = lazy(() => import("../pages/content/PostList"));
const PostDetail = lazy(() => import("../pages/content/PostDetail"));

const Login = lazy(() => import("../pages/Login"));
const Signup = lazy(() => import("../pages/Signup"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));

const Profile = lazy(() => import("../pages/Profile"));
const Notifications = lazy(() => import("../pages/Notifications"));
const MyBookings = lazy(() => import("../pages/MyBookings"));
const BookingDetail = lazy(() => import("../pages/BookingDetail"));
const ChatInbox = lazy(() => import("../pages/ChatInbox"));
const ChatThread = lazy(() => import("../pages/ChatThread"));
const Support = lazy(() => import("../pages/Support"));
const Disputes = lazy(() => import("../pages/Disputes"));

const MyTrucks = lazy(() => import("../pages/MyTrucks"));
const PostTrip = lazy(() => import("../pages/PostTrip"));
const MyTrips = lazy(() => import("../pages/MyTrips"));
const ManageTrip = lazy(() => import("../pages/ManageTrip"));

const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminVerificationQueue = lazy(() => import("../pages/admin/VerificationQueue"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));
const AdminUserDetail = lazy(() => import("../pages/admin/UserDetail"));
const AdminTrucks = lazy(() => import("../pages/admin/Trucks"));
const AdminTrips = lazy(() => import("../pages/admin/Trips"));
const AdminBookings = lazy(() => import("../pages/admin/Bookings"));
const AdminReviews = lazy(() => import("../pages/admin/Reviews"));
const AdminSupport = lazy(() => import("../pages/admin/Support"));
const AdminDisputes = lazy(() => import("../pages/admin/Disputes"));
const AdminTruckDeletions = lazy(() => import("../pages/admin/TruckDeletions"));
const AdminSettings = lazy(() => import("../pages/admin/Settings"));
const AdminAuditLog = lazy(() => import("../pages/admin/AuditLog"));
const AdminSearchLogs = lazy(() => import("../pages/admin/SearchLogs"));
const AdminPosts = lazy(() => import("../pages/admin/Posts"));
const AdminPostEditor = lazy(() => import("../pages/admin/PostEditor"));

export const Routing = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route
        path="/search"
        element={
          <Suspense fallback={<RouteFallback />}>
            <SearchResults />
          </Suspense>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <Suspense fallback={<RouteFallback />}>
            <TripDetail />
          </Suspense>
        }
      />
      <Route
        path="/about"
        element={
          <Suspense fallback={<RouteFallback />}>
            <About />
          </Suspense>
        }
      />
      <Route
        path="/for-shippers"
        element={
          <Suspense fallback={<RouteFallback />}>
            <ForShippers />
          </Suspense>
        }
      />
      <Route
        path="/help"
        element={
          <Suspense fallback={<RouteFallback />}>
            <Help />
          </Suspense>
        }
      />
      <Route
        path="/faq"
        element={
          <Suspense fallback={<RouteFallback />}>
            <Faq />
          </Suspense>
        }
      />
      <Route
        path="/terms"
        element={
          <Suspense fallback={<RouteFallback />}>
            <Terms />
          </Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<RouteFallback />}>
            <Privacy />
          </Suspense>
        }
      />

      <Route
        path="/blog"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PostList type="blog" />
          </Suspense>
        }
      />
      <Route
        path="/blog/:slug"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PostDetail type="blog" />
          </Suspense>
        }
      />
      <Route
        path="/news"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PostList type="news" />
          </Suspense>
        }
      />
      <Route
        path="/news/:slug"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PostDetail type="news" />
          </Suspense>
        }
      />
      <Route
        path="/updates"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PostList type="update" />
          </Suspense>
        }
      />
      <Route
        path="/updates/:slug"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PostDetail type="update" />
          </Suspense>
        }
      />

      <Route
        path="*"
        element={
          <Suspense fallback={<RouteFallback />}>
            <NotFound />
          </Suspense>
        }
      />
    </Route>

    {/* Auth pages get their own full-screen shell (AuthShell) — same
        "not nested under the consumer Layout" reasoning as everything
        else below: a login form belongs on its own deliberate screen, not
        squeezed between the marketing navbar and footer. */}
    <Route
      path="/login"
      element={
        <Suspense fallback={<RouteFallback />}>
          <Login />
        </Suspense>
      }
    />
    <Route
      path="/signup"
      element={
        <Suspense fallback={<RouteFallback />}>
          <Signup />
        </Suspense>
      }
    />
    <Route
      path="/forgot-password"
      element={
        <Suspense fallback={<RouteFallback />}>
          <ForgotPassword />
        </Suspense>
      }
    />
    <Route
      path="/reset-password"
      element={
        <Suspense fallback={<RouteFallback />}>
          <ResetPassword />
        </Suspense>
      }
    />

    {/* Shipper/transporter private pages get their own dashboard shell
        (DashboardLayout) — same "not nested under the consumer Layout"
        pattern as Admin below, so the dashboard's own sidebar+topbar is
        the only chrome around them instead of stacking under the public
        marketing navbar/footer/mobile tab bar too. */}
    <Route element={<RequireAuth />}>
      <Route element={<DashboardLayout />}>
        <Route
          path="/profile"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Profile />
            </Suspense>
          }
        />
        <Route
          path="/notifications"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Notifications />
            </Suspense>
          }
        />
        <Route
          path="/bookings"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MyBookings />
            </Suspense>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <BookingDetail />
            </Suspense>
          }
        />
        <Route
          path="/chat"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ChatInbox />
            </Suspense>
          }
        />
        <Route
          path="/chat/:threadId"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ChatThread />
            </Suspense>
          }
        />
        <Route
          path="/support"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Support />
            </Suspense>
          }
        />
        <Route
          path="/disputes"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Disputes />
            </Suspense>
          }
        />
      </Route>
    </Route>

    <Route element={<RequireRole role="transporter" />}>
      <Route element={<DashboardLayout />}>
        <Route
          path="/trucks"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MyTrucks />
            </Suspense>
          }
        />
        <Route
          path="/trips/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PostTrip />
            </Suspense>
          }
        />
        <Route
          path="/trips/mine"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MyTrips />
            </Suspense>
          }
        />
        <Route
          path="/trips/:id/manage"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ManageTrip />
            </Suspense>
          }
        />
      </Route>
    </Route>

    {/* Admin gets its own dedicated shell (AdminLayout) — deliberately NOT
        nested under the consumer Layout, so admins never see the consumer
        navbar/footer or shipper/transporter nav links. An admin account
        manages the platform; it isn't also a shipper or transporter. */}
    <Route element={<RequireAdmin />}>
      <Route element={<AdminLayout />}>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="/admin/verification"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminVerificationQueue />
            </Suspense>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminUsers />
            </Suspense>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminUserDetail />
            </Suspense>
          }
        />
        <Route
          path="/admin/trucks"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminTrucks />
            </Suspense>
          }
        />
        <Route
          path="/admin/trips"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminTrips />
            </Suspense>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminBookings />
            </Suspense>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminReviews />
            </Suspense>
          }
        />
        <Route
          path="/admin/support"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminSupport />
            </Suspense>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminDisputes />
            </Suspense>
          }
        />
        <Route
          path="/admin/truck-deletions"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminTruckDeletions />
            </Suspense>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminSettings />
            </Suspense>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminAuditLog />
            </Suspense>
          }
        />
        <Route
          path="/admin/search-logs"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminSearchLogs />
            </Suspense>
          }
        />
        <Route
          path="/admin/posts"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminPosts />
            </Suspense>
          }
        />
        <Route
          path="/admin/posts/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminPostEditor />
            </Suspense>
          }
        />
        <Route
          path="/admin/posts/:id/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminPostEditor />
            </Suspense>
          }
        />
      </Route>
    </Route>
  </Routes>
);

export default Routing;

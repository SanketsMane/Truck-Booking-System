import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Spinner";

const CenteredSpinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
    <Spinner $size={28} />
  </div>
);

export const RequireAuth = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
};

// role: "shipper" | "transporter" — admins pass through any role gate.
export const RequireRole = ({ role }) => {
  const { user, loading } = useAuth();

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin && !user.roles.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
};

export const RequireAdmin = () => {
  const { user, loading } = useAuth();

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
};

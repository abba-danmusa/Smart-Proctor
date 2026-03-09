import { Navigate } from "react-router-dom";
import { getDashboardPathForRole, getSessionUser } from "../lib/authSession";

export default function Dashboard() {
  const user = getSessionUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
}

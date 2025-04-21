import { Navigate, Outlet } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import Loader from "@/components/Loader";

export default function ProtectedRoute() {
  const { admin, loading } = useAdmin();
  const token = localStorage.getItem("adminToken");

  if (loading) {
    return <Loader />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

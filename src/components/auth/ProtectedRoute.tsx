import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loginPath: string;
  /** If true, also allows testnet localStorage auth */
  allowTestnet?: boolean;
  testnetKey?: string;
}

const ProtectedRoute = ({ children, loginPath, allowTestnet, testnetKey }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Allow testnet access via localStorage
  if (allowTestnet && testnetKey) {
    const raw = localStorage.getItem(testnetKey);
    if (raw === "true") return <>{children}</>;
    try {
      if (raw && JSON.parse(raw).authenticated === true) return <>{children}</>;
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

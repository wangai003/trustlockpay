import { Outlet, Navigate } from "react-router-dom";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";
import { BuyerProvider } from "@/contexts/BuyerContext";
import TestnetGuide from "@/components/shared/TestnetGuide";

const BuyerLayout = () => {
  const isAuth = localStorage.getItem("tl_buyer_auth") === "true";
  if (!isAuth) return <Navigate to="/trustlock/buyer/login" replace />;

  return (
    <BuyerProvider>
      <div className="flex min-h-screen bg-background">
        <BuyerSidebar />
        <main className="flex-1 lg:ml-64">
          <TestnetGuide role="buyer" />
          <Outlet />
        </main>
      </div>
    </BuyerProvider>
  );
};

export default BuyerLayout;

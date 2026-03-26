import { Outlet, Navigate } from "react-router-dom";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";
import { BuyerProvider } from "@/contexts/BuyerContext";
import TestnetGuide from "@/components/shared/TestnetGuide";
import CommandPalette from "@/components/shared/CommandPalette";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

const BuyerLayoutInner = () => {
  useSessionTimeout("/trustlock/buyer/login");

  return (
    <BuyerProvider>
      <div className="flex min-h-screen bg-background">
        <BuyerSidebar />
        <main className="flex-1 lg:ml-64">
          <TestnetGuide role="buyer" />
          <Outlet />
        </main>
        <CommandPalette role="buyer" />
      </div>
    </BuyerProvider>
  );
};

const BuyerLayout = () => {
  const isAuth = localStorage.getItem("tl_buyer_auth") === "true";
  if (!isAuth) return <Navigate to="/trustlock/buyer/login" replace />;
  return <BuyerLayoutInner />;
};

export default BuyerLayout;

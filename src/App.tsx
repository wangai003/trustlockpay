import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import TrustLock from "./pages/TrustLock.tsx";
import NotFound from "./pages/NotFound.tsx";

// Admin
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminTransactions from "./pages/admin/AdminTransactions.tsx";
import AdminDisputes from "./pages/admin/AdminDisputes.tsx";
import AdminEmmanuel from "./pages/admin/AdminEmmanuel.tsx";
import AdminVendors from "./pages/admin/AdminVendors.tsx";
import AdminBuyers from "./pages/admin/AdminBuyers.tsx";
import AdminCompliance from "./pages/admin/AdminCompliance.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminReports from "./pages/admin/AdminReports.tsx";
import AdminDocuments from "./pages/admin/AdminDocuments.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

// Vendor
import VendorLogin from "./pages/vendor/VendorLogin.tsx";
import VendorOnboarding from "./pages/vendor/VendorOnboarding.tsx";
import VendorLayout from "./pages/vendor/VendorLayout.tsx";
import VendorOverview from "./pages/vendor/VendorOverview.tsx";
import VendorTransactions from "./pages/vendor/VendorTransactions.tsx";
import VendorPayouts from "./pages/vendor/VendorPayouts.tsx";
import VendorSites from "./pages/vendor/VendorSites.tsx";
import VendorKYC from "./pages/vendor/VendorKYC.tsx";
import VendorDocuments from "./pages/vendor/VendorDocuments.tsx";
import VendorSettings from "./pages/vendor/VendorSettings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/trustlock" element={<TrustLock />} />

          {/* Admin Dashboard */}
          <Route path="/trustlock/admin/login" element={<AdminLogin />} />
          <Route path="/trustlock/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="emmanuel" element={<AdminEmmanuel />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="buyers" element={<AdminBuyers />} />
            <Route path="compliance" element={<AdminCompliance />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Vendor Dashboard */}
          <Route path="/trustlock/vendor/login" element={<VendorLogin />} />
          <Route path="/trustlock/vendor/onboarding" element={<VendorOnboarding />} />
          <Route path="/trustlock/vendor" element={<VendorLayout />}>
            <Route index element={<VendorOverview />} />
            <Route path="transactions" element={<VendorTransactions />} />
            <Route path="payouts" element={<VendorPayouts />} />
            <Route path="sites" element={<VendorSites />} />
            <Route path="kyc" element={<VendorKYC />} />
            <Route path="documents" element={<VendorDocuments />} />
            <Route path="settings" element={<VendorSettings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

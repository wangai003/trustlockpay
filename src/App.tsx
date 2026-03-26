import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import TrustLock from "./pages/TrustLock.tsx";
import NotFound from "./pages/NotFound.tsx";

// Admin
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminSetup from "./pages/admin/AdminSetup.tsx";
import AdminResetPassword from "./pages/admin/AdminResetPassword.tsx";
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
import AdminOSPay from "./pages/admin/AdminOSPay.tsx";
import AdminWorkflow from "./pages/admin/AdminWorkflow.tsx";
import AdminPayout from "./pages/admin/AdminPayout.tsx";
import AdminAudit from "./pages/admin/AdminAudit.tsx";
import AuditPortal from "./pages/audit/AuditPortal.tsx";

// Buyer
import BuyerLogin from "./pages/buyer/BuyerLogin.tsx";
import BuyerSignup from "./pages/buyer/BuyerSignup.tsx";
import BuyerLayout from "./pages/buyer/BuyerLayout.tsx";
import BuyerOverview from "./pages/buyer/BuyerOverview.tsx";
import BuyerOrders from "./pages/buyer/BuyerOrders.tsx";
import BuyerDisputes from "./pages/buyer/BuyerDisputes.tsx";
import BuyerDocuments from "./pages/buyer/BuyerDocuments.tsx";
import BuyerSettings from "./pages/buyer/BuyerSettings.tsx";
import BuyerConfirmation from "./pages/buyer/BuyerConfirmation.tsx";
import BuyerAssistant from "./pages/buyer/BuyerAssistant.tsx";
import BuyerHelpCenter from "./pages/buyer/BuyerHelpCenter.tsx";
import BuyerAnalytics from "./pages/buyer/BuyerAnalytics.tsx";
import BuyerOSPay from "./pages/buyer/BuyerOSPay.tsx";
import BuyerPayout from "./pages/buyer/BuyerPayout.tsx";
import BuyerBillPayments from "./pages/buyer/BuyerBillPayments.tsx";

// Vendor
import VendorLogin from "./pages/vendor/VendorLogin.tsx";
import VendorSignup from "./pages/vendor/VendorSignup.tsx";
import VendorOnboarding from "./pages/vendor/VendorOnboarding.tsx";
import VendorLayout from "./pages/vendor/VendorLayout.tsx";
import VendorOverview from "./pages/vendor/VendorOverview.tsx";
import VendorTransactions from "./pages/vendor/VendorTransactions.tsx";
import VendorPayouts from "./pages/vendor/VendorPayouts.tsx";
import VendorSites from "./pages/vendor/VendorSites.tsx";
import VendorKYC from "./pages/vendor/VendorKYC.tsx";
import VendorDocuments from "./pages/vendor/VendorDocuments.tsx";
import VendorSettings from "./pages/vendor/VendorSettings.tsx";
import VendorAssistant from "./pages/vendor/VendorAssistant.tsx";
import VendorHelpCenter from "./pages/vendor/VendorHelpCenter.tsx";
import VendorPricing from "./pages/vendor/VendorPricing.tsx";
import VendorCheckout from "./pages/vendor/VendorCheckout.tsx";
import VendorAnalytics from "./pages/vendor/VendorAnalytics.tsx";
import VendorOSPay from "./pages/vendor/VendorOSPay.tsx";
import VendorPayout from "./pages/vendor/VendorPayout.tsx";
import VendorBillPayments from "./pages/vendor/VendorBillPayments.tsx";
import VendorStandaloneLinks from "./pages/vendor/VendorStandaloneLinks.tsx";
import PublicCheckout from "./pages/public/PublicCheckout.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TrustLock />} />

            {/* Admin Dashboard */}
            <Route path="/trustlock/admin/login" element={<AdminLogin />} />
            <Route path="/trustlock/admin/setup" element={<AdminSetup />} />
            <Route path="/trustlock/admin/reset-password" element={<AdminResetPassword />} />
            <Route path="/trustlock/admin" element={
              <ProtectedRoute loginPath="/trustlock/admin/login" allowTestnet testnetKey="tl_admin_auth">
                <AdminLayout />
              </ProtectedRoute>
            }>
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
              <Route path="workflow" element={<AdminWorkflow />} />
              <Route path="os-pay" element={<AdminOSPay />} />
              <Route path="payout" element={<AdminPayout />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Vendor Dashboard */}
            <Route path="/trustlock/vendor/login" element={<VendorLogin />} />
            <Route path="/trustlock/vendor/signup" element={<VendorSignup />} />
            <Route path="/trustlock/vendor/onboarding" element={<VendorOnboarding />} />
            <Route path="/trustlock/vendor" element={
              <ProtectedRoute loginPath="/trustlock/vendor/login" allowTestnet testnetKey="tl_vendor_auth">
                <VendorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<VendorOverview />} />
              <Route path="bill-payments" element={<VendorBillPayments />} />
              <Route path="transactions" element={<VendorTransactions />} />
              <Route path="payouts" element={<VendorPayouts />} />
              <Route path="sites" element={<VendorSites />} />
              <Route path="kyc" element={<VendorKYC />} />
              <Route path="assistant" element={<VendorAssistant />} />
              <Route path="documents" element={<VendorDocuments />} />
              <Route path="help" element={<VendorHelpCenter />} />
              <Route path="pricing" element={<VendorPricing />} />
              <Route path="checkout" element={<VendorCheckout />} />
              <Route path="analytics" element={<VendorAnalytics />} />
              <Route path="os-pay" element={<VendorOSPay />} />
              <Route path="payout" element={<VendorPayout />} />
              <Route path="standalone-links" element={<VendorStandaloneLinks />} />
              <Route path="settings" element={<VendorSettings />} />
            </Route>

            {/* Buyer Dashboard */}
            <Route path="/trustlock/buyer/login" element={<BuyerLogin />} />
            <Route path="/trustlock/buyer/signup" element={<BuyerSignup />} />
            <Route path="/trustlock/buyer" element={
              <ProtectedRoute loginPath="/trustlock/buyer/login" allowTestnet testnetKey="tl_buyer_auth">
                <BuyerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BuyerOverview />} />
              <Route path="bill-payments" element={<BuyerBillPayments />} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="disputes" element={<BuyerDisputes />} />
              <Route path="assistant" element={<BuyerAssistant />} />
              <Route path="documents" element={<BuyerDocuments />} />
              <Route path="help" element={<BuyerHelpCenter />} />
              <Route path="analytics" element={<BuyerAnalytics />} />
              <Route path="os-pay" element={<BuyerOSPay />} />
              <Route path="payout" element={<BuyerPayout />} />
              <Route path="settings" element={<BuyerSettings />} />
            </Route>

            {/* Standalone Confirmation Page (no login required) */}
            <Route path="/trustlock/confirm/:txId" element={<BuyerConfirmation />} />

            {/* Read-Only Audit Portal (token-based access) */}
            <Route path="/trustlock/audit/:token" element={<AuditPortal />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

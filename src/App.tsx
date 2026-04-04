import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const TrustLock = lazy(() => import("./pages/TrustLock"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminSetup = lazy(() => import("./pages/admin/AdminSetup"));
const AdminResetPassword = lazy(() => import("./pages/admin/AdminResetPassword"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));
const AdminEmmanuel = lazy(() => import("./pages/admin/AdminEmmanuel"));
const AdminVendors = lazy(() => import("./pages/admin/AdminVendors"));
const AdminBuyers = lazy(() => import("./pages/admin/AdminBuyers"));
const AdminCompliance = lazy(() => import("./pages/admin/AdminCompliance"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminDocuments = lazy(() => import("./pages/admin/AdminDocuments"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const AdminWorkflow = lazy(() => import("./pages/admin/AdminWorkflow"));
const AdminOSPay = lazy(() => import("./pages/admin/AdminPayout"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminIndustryPlaybook = lazy(() => import("./pages/admin/AdminIndustryPlaybook"));
const AdminTLIdSearch = lazy(() => import("./pages/admin/AdminTLIdSearch"));
const AdminTaxRemittance = lazy(() => import("./pages/admin/AdminTaxRemittance"));
const AdminBlockchainProofs = lazy(() => import("./pages/admin/AdminBlockchainProofs"));
const AdminGasTreasury = lazy(() => import("./pages/admin/AdminGasTreasury"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AuditPortal = lazy(() => import("./pages/audit/AuditPortal"));

// Buyer
const BuyerLogin = lazy(() => import("./pages/buyer/BuyerLogin"));
const BuyerSignup = lazy(() => import("./pages/buyer/BuyerSignup"));
const BuyerLayout = lazy(() => import("./pages/buyer/BuyerLayout"));
const BuyerOverview = lazy(() => import("./pages/buyer/BuyerOverview"));
const BuyerOrders = lazy(() => import("./pages/buyer/BuyerOrders"));
const BuyerDisputes = lazy(() => import("./pages/buyer/BuyerDisputes"));
const BuyerDocuments = lazy(() => import("./pages/buyer/BuyerDocuments"));
const BuyerSettings = lazy(() => import("./pages/buyer/BuyerSettings"));
const BuyerConfirmation = lazy(() => import("./pages/buyer/BuyerConfirmation"));
const BuyerAssistant = lazy(() => import("./pages/buyer/BuyerAssistant"));
const BuyerHelpCenter = lazy(() => import("./pages/buyer/BuyerHelpCenter"));
const BuyerAnalytics = lazy(() => import("./pages/buyer/BuyerAnalytics"));
const BuyerOSPay = lazy(() => import("./pages/buyer/BuyerOSPay"));
const BuyerPayout = lazy(() => import("./pages/buyer/BuyerPayout"));
const BuyerBillPayments = lazy(() => import("./pages/buyer/BuyerBillPayments"));
const BuyerIndustryPlaybook = lazy(() => import("./pages/buyer/BuyerIndustryPlaybook"));
const BuyerTeams = lazy(() => import("./pages/buyer/BuyerTeams"));
const BuyerMessages = lazy(() => import("./pages/buyer/BuyerMessages"));

// Vendor
const VendorLogin = lazy(() => import("./pages/vendor/VendorLogin"));
const VendorSignup = lazy(() => import("./pages/vendor/VendorSignup"));
const VendorOnboarding = lazy(() => import("./pages/vendor/VendorOnboarding"));
const VendorLayout = lazy(() => import("./pages/vendor/VendorLayout"));
const VendorOverview = lazy(() => import("./pages/vendor/VendorOverview"));
const VendorTransactions = lazy(() => import("./pages/vendor/VendorTransactions"));

const VendorSites = lazy(() => import("./pages/vendor/VendorSites"));
const VendorKYC = lazy(() => import("./pages/vendor/VendorKYC"));
const VendorDocuments = lazy(() => import("./pages/vendor/VendorDocuments"));
const VendorSettings = lazy(() => import("./pages/vendor/VendorSettings"));
const VendorAssistant = lazy(() => import("./pages/vendor/VendorAssistant"));
const VendorHelpCenter = lazy(() => import("./pages/vendor/VendorHelpCenter"));
const VendorPricing = lazy(() => import("./pages/vendor/VendorPricing"));
const VendorCheckout = lazy(() => import("./pages/vendor/VendorCheckout"));
const VendorAnalytics = lazy(() => import("./pages/vendor/VendorAnalytics"));
const VendorOSPay = lazy(() => import("./pages/vendor/VendorOSPay"));
const VendorPayout = lazy(() => import("./pages/vendor/VendorPayout"));
const VendorBillPayments = lazy(() => import("./pages/vendor/VendorBillPayments"));
const VendorStandaloneLinks = lazy(() => import("./pages/vendor/VendorStandaloneLinks"));
const VendorIndustryPlaybook = lazy(() => import("./pages/vendor/VendorIndustryPlaybook"));
const VendorTeams = lazy(() => import("./pages/vendor/VendorTeams"));
const VendorMessages = lazy(() => import("./pages/vendor/VendorMessages"));
const VendorMarketplaceOrders = lazy(() => import("./pages/vendor/VendorMarketplaceOrders"));
const VendorClaimAccount = lazy(() => import("./pages/vendor/VendorClaimAccount"));
const PublicCheckout = lazy(() => import("./pages/public/PublicCheckout"));
const WidgetCheckout = lazy(() => import("./pages/public/WidgetCheckout"));
const TesterLanding = lazy(() => import("./pages/public/TesterLanding"));
const DisputePolicy = lazy(() => import("./pages/public/DisputePolicy"));
const PrivacyPolicy = lazy(() => import("./pages/public/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/public/CookiePolicy"));
const DataRights = lazy(() => import("./pages/public/DataRights"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
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
                <Route path="audit" element={<AdminAudit />} />
                <Route path="industry-playbook" element={<AdminIndustryPlaybook />} />
                <Route path="tl-id" element={<AdminTLIdSearch />} />
                <Route path="tax-remittance" element={<AdminTaxRemittance />} />
                <Route path="blockchain-proofs" element={<AdminBlockchainProofs />} />
                <Route path="gas-treasury" element={<AdminGasTreasury />} />
                <Route path="messages" element={<AdminMessages />} />
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
                <Route path="teams" element={<VendorTeams />} />
                <Route path="messages" element={<VendorMessages />} />
                <Route path="industry-playbook" element={<VendorIndustryPlaybook />} />
                <Route path="marketplace-orders" element={<VendorMarketplaceOrders />} />
                <Route path="settings" element={<VendorSettings />} />
              </Route>

              {/* Vendor Claim (public — outside protected route) */}
              <Route path="/vendor/claim" element={<VendorClaimAccount />} />

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
                <Route path="teams" element={<BuyerTeams />} />
                <Route path="messages" element={<BuyerMessages />} />
                <Route path="industry-playbook" element={<BuyerIndustryPlaybook />} />
                <Route path="settings" element={<BuyerSettings />} />
              </Route>

              <Route path="/trustlock/confirm/:txId" element={<BuyerConfirmation />} />
              <Route path="/pay/widget-checkout" element={<WidgetCheckout />} />
              <Route path="/pay/:linkId" element={<PublicCheckout />} />
              <Route path="/dispute-policy" element={<DisputePolicy />} />
              <Route path="/test-widget" element={<TesterLanding />} />
              <Route path="/trustlock/audit/:token" element={<AuditPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

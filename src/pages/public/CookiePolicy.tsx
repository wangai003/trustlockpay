import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CookiePolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Cookie Policy</h1>
      </div>
    </header>

    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-sm dark:prose-invert">
      <p className="text-muted-foreground text-sm">Last updated: April 4, 2026</p>

      <h2>1. What Are Cookies</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help
        the site remember your preferences and maintain your session.
      </p>

      <h2>2. Cookies We Use</h2>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Type</th><th>Purpose</th><th>Duration</th></tr>
        </thead>
        <tbody>
          <tr><td>sb-*-auth-token</td><td>Essential</td><td>Authentication session</td><td>Session / 7 days</td></tr>
          <tr><td>tl_vendor_auth</td><td>Essential</td><td>Vendor login state</td><td>Session</td></tr>
          <tr><td>tl_buyer_auth</td><td>Essential</td><td>Buyer login state</td><td>Session</td></tr>
          <tr><td>tl_admin_auth</td><td>Essential</td><td>Admin login state</td><td>Session</td></tr>
          <tr><td>tl_*_network</td><td>Essential</td><td>Testnet/mainnet mode</td><td>Session</td></tr>
        </tbody>
      </table>

      <h2>3. Third-Party Cookies</h2>
      <p>
        We do not use third-party advertising or tracking cookies. Payment processors (Stripe, Coinbase)
        may set their own cookies during checkout — please refer to their respective privacy policies.
      </p>

      <h2>4. Local Storage</h2>
      <p>
        In addition to cookies, we use browser localStorage for:
      </p>
      <ul>
        <li>Authentication state persistence</li>
        <li>Terms of Service acceptance tracking</li>
        <li>Network mode preferences (testnet/mainnet)</li>
        <li>Offline queue for connectivity resilience</li>
      </ul>

      <h2>5. Managing Cookies</h2>
      <p>
        Since we only use essential cookies required for the platform to function, disabling them
        may prevent you from logging in or completing transactions. You can manage cookies through
        your browser settings.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about our cookie practices? Contact us at privacy@trustlockpay.com.
      </p>
    </main>
  </div>
);

export default CookiePolicy;

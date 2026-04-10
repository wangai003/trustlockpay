import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
      </div>
    </header>

    <main className="container mx-auto px-4 py-10 max-w-3xl prose prose-sm dark:prose-invert">
      <p className="text-muted-foreground text-sm">Last updated: April 4, 2026</p>

      <h2>1. Introduction</h2>
      <p>
        TrustLock ("we", "us", "our") provides an escrow payment gateway for
        cross-border trade. This Privacy Policy explains how we collect, use, disclose, and protect
        your personal data when you use our platform and related services.
      </p>

      <h2>2. Data We Collect</h2>
      <h3>2.1 Information You Provide</h3>
      <ul>
        <li><strong>Account data:</strong> Full name, email address, phone number, company name, entity type</li>
        <li><strong>Identity verification (KYC/KYB):</strong> Government-issued ID, selfie with ID, business registration documents, UBO declarations, tax ID</li>
        <li><strong>Transaction data:</strong> Order amounts, payment methods, milestone details, delivery confirmations</li>
        <li><strong>Communications:</strong> Messages, dispute filings, support requests</li>
      </ul>

      <h3>2.2 Information We Collect Automatically</h3>
      <ul>
        <li><strong>Technical data:</strong> IP address, browser type, user agent, device fingerprint</li>
        <li><strong>Usage data:</strong> Pages visited, features used, session duration</li>
        <li><strong>Legal signatures:</strong> IP address, user agent, and timestamp at the time of signing contracts, acknowledgement forms, and terms of service</li>
        <li><strong>Geolocation data:</strong> With your browser permission, we capture GPS coordinates (latitude, longitude, accuracy) during milestone completion for applicable industries involving physical goods, construction, or cross-border shipments. These coordinates are resolved into human-readable addresses (street, city, state, country, postal code) using OpenStreetMap's Nominatim service for audit and compliance purposes. Location data is stored in your transaction record and anchored to the blockchain proof chain.</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <table>
        <thead>
          <tr><th>Purpose</th><th>Lawful Basis</th></tr>
        </thead>
        <tbody>
          <tr><td>Process escrow transactions</td><td>Contract performance</td></tr>
          <tr><td>KYC/KYB identity verification</td><td>Legal obligation (AML/CFT)</td></tr>
          <tr><td>Sanctions screening (OFAC, EU, UN)</td><td>Legal obligation</td></tr>
          <tr><td>Fraud prevention & velocity monitoring</td><td>Legitimate interest</td></tr>
          <tr><td>Dispute resolution & evidence archival</td><td>Contract performance / Legal obligation</td></tr>
          <tr><td>Blockchain anchoring of audit trails</td><td>Legitimate interest (trade integrity)</td></tr>
          <tr><td>GPS capture & reverse geocoding for milestone verification</td><td>Consent (browser permission) / Legitimate interest (trade integrity)</td></tr>
          <tr><td>Platform notifications & communications</td><td>Contract performance</td></tr>
          <tr><td>Analytics & service improvement</td><td>Legitimate interest</td></tr>
        </tbody>
      </table>

      <h2>4. Data Retention</h2>
      <ul>
        <li><strong>Transaction records:</strong> Auto-archived after 90 days of inactivity; retained for 12 months in active storage</li>
        <li><strong>Legal & compliance documents:</strong> 7-year immutable retention per AML/CFT regulations (contracts, AML certificates, payout receipts, dispute evidence)</li>
        <li><strong>KYC documents:</strong> Retained for the duration of your account plus 7 years after closure</li>
        <li><strong>Account data:</strong> Retained until account deletion, followed by 14-day grace period before permanent removal</li>
      </ul>

      <h2>5. Data Sharing</h2>
      <p>We do not sell your personal data. We share data only with:</p>
      <ul>
        <li><strong>Transaction counterparties:</strong> Buyer/vendor names and order details necessary for completing escrow transactions</li>
        <li><strong>Payment processors:</strong> Stripe, Coinbase Commerce, and Transak for payment processing</li>
        <li><strong>Infrastructure providers:</strong> Cloud hosting and database services for platform operation</li>
        <li><strong>Regulatory authorities:</strong> When required by law (e.g., Suspicious Activity Reports)</li>
        <li><strong>Auditors:</strong> Limited, time-bound access for compliance audits (password-protected sessions)</li>
      </ul>

      <h2>6. International Transfers</h2>
      <p>
        As a cross-border trade platform, your data may be processed in jurisdictions outside your country of residence.
        We implement appropriate safeguards including encryption in transit and at rest, access controls, and
        contractual obligations with service providers.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction (GDPR, NDPA, POPIA, etc.), you may have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal data</li>
        <li><strong>Rectify</strong> inaccurate data</li>
        <li><strong>Delete</strong> your account and associated data (subject to legal retention obligations)</li>
        <li><strong>Export</strong> your data in a portable format</li>
        <li><strong>Object</strong> to processing based on legitimate interest</li>
        <li><strong>Withdraw consent</strong> where processing is based on consent</li>
      </ul>
      <p>
        To exercise these rights, visit your <Link to="/data-rights" className="text-primary hover:underline">Data Rights</Link> page
        or contact us at privacy@trustlockpay.com.
      </p>

      <h2>8. Security</h2>
      <p>
        We implement industry-standard security measures including Row-Level Security on all database tables,
        encrypted storage, role-based access control, session timeouts, account lockout policies,
        and blockchain-anchored audit trails for evidence integrity.
      </p>

      <h2>9. Cookies & Tracking</h2>
      <p>
        We use essential cookies for authentication session management and security. We do not use
        third-party advertising trackers. For details, see our <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.
      </p>

      <h2>10. Children's Privacy</h2>
      <p>
        Our platform is not intended for individuals under the age of 18. We do not knowingly
        collect personal data from minors.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be communicated via
        platform notification. Continued use of the platform after changes constitutes acceptance.
      </p>

      <h2>12. Contact</h2>
      <p>
        For privacy inquiries:<br />
        Email: privacy@trustlockpay.com<br />
        Data Protection Officer: dpo@trustlockpay.com
      </p>
    </main>
  </div>
);

export default PrivacyPolicy;

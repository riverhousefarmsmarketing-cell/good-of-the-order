import LegalLayout, { legalContentStyles as s } from './LegalLayout';

/**
 * Privacy Policy — GoodOfTheOrder v1.0
 *
 * STATUS: Drafted to match Terms of Service v1.3 (attorney-reviewed).
 * This Privacy Policy itself has NOT yet been independently attorney-reviewed.
 * Recommended: send to TOS attorney for a quick consistency pass before publishing.
 *
 * Operator: Riverhouse Farms LLC (Washington state)
 * Canonical URL: https://goodoftheorder.app/privacy (referenced in TOS §15)
 *
 * Covers all five third-party processors listed in TOS §10:
 * Supabase (AWS), Vercel, Resend, Stripe, Sentry.
 *
 * To update: edit the JSX here, bump version + lastUpdated below, commit.
 * Material changes require notice per §10 of this policy.
 */
export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effectiveDate="April 13, 2026"
      lastUpdated="April 13, 2026"
      version="1.0"
    >
      <p style={s.p}>
        This Privacy Policy describes how Riverhouse Farms LLC ("we," "us," "our") collects, uses, stores, and protects information
        when you use GoodOfTheOrder (the "Service"). It is incorporated by reference into our{' '}
        <a href="/terms" style={s.link}>Terms of Service</a>.
      </p>
      <p style={s.callout}>
        <strong style={s.strong}>The short version:</strong> We collect only what's needed to run the Service. Your meeting content belongs to you.
        We don't sell your data. We don't use it for advertising. We never share it with third parties for marketing purposes.
        You can export your data and close your account at any time.
      </p>

      <h2 style={s.h2}>1. Information We Collect</h2>

      <h3 style={s.h3}>1.1 Information You Provide</h3>
      <p style={s.p}>When you create an account and use the Service, you provide:</p>
      <ul style={s.ul}>
        <li style={s.li}><strong style={s.strong}>Account information:</strong> name, email address, password (stored as a one-way hash, never in plain text)</li>
        <li style={s.li}><strong style={s.strong}>Organization information:</strong> organization name, logo, board structure, default roles</li>
        <li style={s.li}><strong style={s.strong}>Member information:</strong> names, contact information, board positions, and other directory fields you enter for your organization's members</li>
        <li style={s.li}><strong style={s.strong}>Meeting content:</strong> agendas, minutes, motions, votes, attendance records, financial figures, and any other governance records you create through the Service</li>
        <li style={s.li}><strong style={s.strong}>Communications:</strong> messages you send to support, feedback you submit through the in-app feedback tool</li>
        <li style={s.li}><strong style={s.strong}>Billing information:</strong> when you subscribe to a paid plan, billing details are collected and stored by our payment processor (Stripe). We do not store credit card numbers on our servers.</li>
      </ul>

      <h3 style={s.h3}>1.2 Information Collected Automatically</h3>
      <p style={s.p}>When you use the Service, we automatically collect:</p>
      <ul style={s.ul}>
        <li style={s.li}><strong style={s.strong}>Authentication and session data:</strong> login timestamps, session tokens, IP address used at sign-in (for security)</li>
        <li style={s.li}><strong style={s.strong}>Usage logs:</strong> requests made to our servers, error events, and performance metrics needed to operate the Service</li>
        <li style={s.li}><strong style={s.strong}>Browser and device information:</strong> when an error occurs, our error tracking service records browser type, operating system, screen size, and a stack trace (no meeting content is included)</li>
      </ul>
      <p style={s.p}>
        We do not use third-party advertising trackers, behavioral analytics that follow you across sites, or cookies for marketing purposes.
      </p>

      <h2 style={s.h2}>2. How We Use Your Information</h2>
      <p style={s.p}>We use the information we collect only for the following purposes:</p>
      <ul style={s.ul}>
        <li style={s.li}><strong style={s.strong}>To provide the Service:</strong> creating, storing, displaying, and distributing your governance records</li>
        <li style={s.li}><strong style={s.strong}>To authenticate you and protect your account:</strong> verifying your identity, detecting suspicious activity, sending password reset emails</li>
        <li style={s.li}><strong style={s.strong}>To send transactional emails:</strong> account verification, password resets, meeting minute distribution to your board members, billing notifications</li>
        <li style={s.li}><strong style={s.strong}>To provide customer support:</strong> responding to your questions and troubleshooting issues you report</li>
        <li style={s.li}><strong style={s.strong}>To process payments:</strong> charging your subscription through Stripe and managing renewals</li>
        <li style={s.li}><strong style={s.strong}>To improve the Service:</strong> identifying bugs, measuring performance, and understanding which features are used (using aggregated, non-identifying data)</li>
        <li style={s.li}><strong style={s.strong}>To comply with legal obligations:</strong> responding to lawful requests, enforcing our Terms of Service, and meeting tax and accounting requirements</li>
      </ul>
      <p style={s.p}>
        We do not use your meeting content, member information, or any of your organization's data to train artificial intelligence or machine learning models.
        We do not analyze the substance of your meetings for any purpose other than providing the features you actively use.
      </p>

      <h2 style={s.h2}>3. How We Share Information</h2>
      <p style={s.callout}>
        <strong style={s.strong}>We do not sell, rent, or share your data with any third party for marketing or advertising purposes. Ever.</strong>
      </p>
      <p style={s.p}>
        We share information only in the following limited circumstances:
      </p>

      <h3 style={s.h3}>3.1 With Service Providers (Subprocessors)</h3>
      <p style={s.p}>
        We rely on a small number of trusted third-party service providers to operate the Service. Each is bound by their own privacy and security commitments,
        and each receives only the minimum data necessary to perform their function. Our current subprocessors are:
      </p>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Provider</th>
            <th style={s.th}>Purpose</th>
            <th style={s.th}>Data Accessed</th>
            <th style={s.th}>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={s.td}>Supabase (on AWS)</td>
            <td style={s.td}>Database hosting, authentication</td>
            <td style={s.td}>All application data (encrypted at rest)</td>
            <td style={s.td}>United States</td>
          </tr>
          <tr>
            <td style={s.td}>Vercel</td>
            <td style={s.td}>Application hosting and delivery</td>
            <td style={s.td}>Web traffic; no persistent storage</td>
            <td style={s.td}>United States</td>
          </tr>
          <tr>
            <td style={s.td}>Resend</td>
            <td style={s.td}>Transactional email delivery</td>
            <td style={s.td}>Recipient email addresses, email content</td>
            <td style={s.td}>United States</td>
          </tr>
          <tr>
            <td style={s.td}>Stripe</td>
            <td style={s.td}>Payment processing</td>
            <td style={s.td}>Billing details (not stored by us)</td>
            <td style={s.td}>United States</td>
          </tr>
          <tr>
            <td style={s.td}>Sentry</td>
            <td style={s.td}>Error tracking and monitoring</td>
            <td style={s.td}>Browser info, error stack traces (no meeting content)</td>
            <td style={s.td}>United States</td>
          </tr>
        </tbody>
      </table>
      <p style={s.p}>
        We will update this list when we add or change subprocessors. If we add a new subprocessor that processes your personal data, we will update the
        "Last Updated" date on this page and notify account administrators by email if the change is material.
      </p>

      <h3 style={s.h3}>3.2 Within Your Organization</h3>
      <p style={s.p}>
        Information you create within an organization is visible to other members of that organization according to their assigned role (Admin, Editor, or Viewer).
        Database-level row-level security policies prevent any user from accessing data belonging to organizations they are not a member of. This is the foundation
        of how the Service maintains separation between organizations.
      </p>

      <h3 style={s.h3}>3.3 With Recipients You Choose</h3>
      <p style={s.p}>
        When you use the Service to email meeting minutes to your board members or distribution list, the email addresses and content you choose to send are delivered
        to those recipients. You control what gets sent and to whom.
      </p>

      <h3 style={s.h3}>3.4 For Legal Reasons</h3>
      <p style={s.p}>
        We may disclose information if required by law, subpoena, court order, or other valid legal process; if necessary to protect the rights, property, or safety
        of Riverhouse Farms LLC, our customers, or the public; or to investigate fraud or violations of our Terms of Service. We will resist overbroad requests
        and notify affected customers when legally permitted to do so.
      </p>

      <h3 style={s.h3}>3.5 In Connection with a Business Transfer</h3>
      <p style={s.p}>
        If we are involved in a merger, acquisition, reorganization, or sale of all or substantially all of our assets, your information may be transferred as part
        of that transaction. We will notify you in advance and ensure that any successor is bound by privacy commitments at least as protective as this Policy.
      </p>

      <h2 style={s.h2}>4. Data Storage and Security</h2>
      <p style={s.p}>
        We take the security of your data seriously and apply industry-standard practices appropriate for governance records:
      </p>
      <ul style={s.ul}>
        <li style={s.li}>All data is encrypted at rest using AES-256 encryption</li>
        <li style={s.li}>All data is transmitted over TLS 1.2 or higher</li>
        <li style={s.li}>Each organization's data is isolated using database-level row-level security policies</li>
        <li style={s.li}>User roles (Admin, Editor, Viewer) control access within each organization</li>
        <li style={s.li}>Email verification is required before any data can be created or modified</li>
        <li style={s.li}>Passwords are stored as one-way hashes, never in plain text</li>
        <li style={s.li}>We maintain regular automated backups of all data</li>
      </ul>
      <p style={s.p}>
        Your data is stored on Supabase infrastructure hosted on Amazon Web Services in the United States. While we apply strong protections,
        no system can be guaranteed completely secure. In the event of a data breach, we will notify affected customers in accordance with Section 9.1 of our Terms of Service
        and applicable Washington state law (RCW 19.255.010).
      </p>

      <h2 style={s.h2}>5. Data Retention</h2>
      <p style={s.p}>We retain your information for as long as your account is active. When you cancel your subscription:</p>
      <ul style={s.ul}>
        <li style={s.li}>Your account remains accessible in read-only mode through the end of your current billing period</li>
        <li style={s.li}>You may export your data during this period using the PDF generation features</li>
        <li style={s.li}>After the billing period ends, your data is retained for 30 additional days in case you change your mind</li>
        <li style={s.li}>After the 30-day retention period, your data is permanently deleted from our active systems</li>
        <li style={s.li}>Backups containing your data are retained for up to 30 additional days, after which they are also deleted as part of normal backup rotation</li>
      </ul>
      <p style={s.p}>
        We may retain limited records (such as billing history and email logs) for longer where required by tax, accounting, or other legal obligations.
        Aggregated, anonymized data that cannot identify you or your organization may be retained indefinitely.
      </p>

      <h2 style={s.h2}>6. Your Rights and Choices</h2>
      <p style={s.p}>You have the following rights regarding your information:</p>
      <ul style={s.ul}>
        <li style={s.li}><strong style={s.strong}>Access:</strong> view all the information your organization has stored in the Service through your normal account access</li>
        <li style={s.li}><strong style={s.strong}>Correction:</strong> update or correct your account information and your organization's data through the Service interface</li>
        <li style={s.li}><strong style={s.strong}>Export:</strong> download your meeting records as PDF documents at any time</li>
        <li style={s.li}><strong style={s.strong}>Deletion:</strong> request deletion of your personal information by closing your account or contacting us at <a href="mailto:support@goodoftheorder.app" style={s.link}>support@goodoftheorder.app</a></li>
        <li style={s.li}><strong style={s.strong}>Objection:</strong> object to certain processing or withdraw consent where processing is based on consent</li>
        <li style={s.li}><strong style={s.strong}>Portability:</strong> receive your data in a portable format (currently PDF; we are committed to expanding export capabilities as the Service develops)</li>
      </ul>
      <p style={s.p}>
        To exercise any of these rights, contact us at <a href="mailto:support@goodoftheorder.app" style={s.link}>support@goodoftheorder.app</a>.
        We will respond within 30 days. If you are an Editor or Viewer in an organization, some rights may be exercised through your organization's Admin
        rather than directly with us, since the Admin is the controller of that organization's data.
      </p>

      <h2 style={s.h2}>7. Children's Privacy</h2>
      <p style={s.p}>
        The Service is not directed to children under 18. We do not knowingly collect personal information from children under 18.
        If you become aware that a child has provided us with personal information, please contact us and we will take steps to delete that information.
        Account creation requires you to confirm you are at least 18 years old.
      </p>

      <h2 style={s.h2}>8. Cookies and Similar Technologies</h2>
      <p style={s.p}>
        We use cookies and similar browser storage only for purposes that are strictly necessary to operate the Service:
      </p>
      <ul style={s.ul}>
        <li style={s.li}><strong style={s.strong}>Authentication cookies:</strong> to keep you signed in between page loads</li>
        <li style={s.li}><strong style={s.strong}>Session storage:</strong> to remember your preferences within a single visit</li>
        <li style={s.li}><strong style={s.strong}>Security tokens:</strong> to protect against cross-site request forgery and other attacks</li>
      </ul>
      <p style={s.p}>
        We do not use advertising cookies, third-party tracking pixels, or analytics that follow you across other websites. Because we do not use any
        non-essential tracking technologies, we do not display a cookie consent banner. You can disable cookies in your browser settings, but doing so will prevent you from signing in to the Service.
      </p>

      <h2 style={s.h2}>9. International Users</h2>
      <p style={s.p}>
        The Service is operated from the United States and is intended for use by organizations located in the United States. If you access the Service from outside
        the United States, you understand that your information will be transferred to, stored, and processed in the United States, where data protection laws may differ
        from those in your jurisdiction. By using the Service, you consent to that transfer.
      </p>
      <p style={s.p}>
        We do not currently offer a Data Processing Agreement under GDPR or similar non-US regulatory frameworks. If your organization requires one, please contact us
        and we will discuss whether we can accommodate your requirements.
      </p>

      <h2 style={s.h2}>10. Changes to This Policy</h2>
      <p style={s.p}>
        We may update this Privacy Policy from time to time to reflect changes in the Service, our practices, or legal requirements. When we make material changes:
      </p>
      <ul style={s.ul}>
        <li style={s.li}>We will update the "Last Updated" date at the top of this page</li>
        <li style={s.li}>We will notify account administrators by email at least 30 days before the changes take effect</li>
        <li style={s.li}>If you disagree with the changes, you may cancel your account and export your data before the effective date</li>
      </ul>
      <p style={s.p}>
        Continued use of the Service after the effective date constitutes acceptance of the updated Policy.
      </p>

      <h2 style={s.h2}>11. Contact Us</h2>
      <p style={s.p}>If you have questions about this Privacy Policy or how we handle your information, please contact us at:</p>
      <p style={s.p}>
        <strong style={s.strong}>Riverhouse Farms LLC</strong><br />
        Email: <a href="mailto:support@goodoftheorder.app" style={s.link}>support@goodoftheorder.app</a><br />
        Website: <a href="https://goodoftheorder.app" style={s.link}>https://goodoftheorder.app</a>
      </p>
      <p style={s.p}>
        For privacy-specific inquiries, please put "Privacy Question" in the subject line and we will route your message accordingly.
      </p>
    </LegalLayout>
  );
}

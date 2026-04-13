import LegalLayout, { legalContentStyles as s } from './LegalLayout';

/**
 * Terms of Service — GoodOfTheOrder v1.3 (attorney-reviewed final).
 *
 * Source of truth: GoodOfTheOrder-TOS-v1.4.docx
 * Operator: Riverhouse Farms LLC (Washington state)
 * Canonical URL: https://goodoftheorder.app/terms
 *
 * To update: edit the JSX here, bump version + lastUpdated below, commit.
 * Material changes require 30-day email notice to all account holders (see §16).
 */
export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      effectiveDate="April 13, 2026"
      lastUpdated="April 13, 2026"
      version="1.4"
    >
      <p style={s.p}>
        These Terms govern your use of GoodOfTheOrder. By creating an account or using the Service, you agree to these Terms.
        If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
      </p>

      <h2 style={s.h2}>1. Definitions</h2>
      <p style={s.p}>
        <strong style={s.strong}>"Service"</strong> means the GoodOfTheOrder platform, including all software, web application,
        content, documentation, and related services provided by us at goodoftheorder.app, collectively referred to throughout these Terms as the "Service."
      </p>
      <p style={s.p}><strong style={s.strong}>"Terms"</strong> means this Terms of Service agreement.</p>
      <p style={s.p}><strong style={s.strong}>"You"</strong> and <strong style={s.strong}>"your"</strong> refer to you individually and, if applicable, the organization you represent.</p>
      <p style={s.p}>
        <strong style={s.strong}>"We," "us," and "our"</strong> refer to Riverhouse Farms LLC, a Washington state limited liability company, operator of the Service.
      </p>
      <p style={s.p}>
        <strong style={s.strong}>"Organization"</strong> means a group account on the Service representing a Farm Bureau county, nonprofit board, HOA, or similar governance body.
      </p>
      <p style={s.p}>
        <strong style={s.strong}>"Content"</strong> means all data, text, meeting minutes, agendas, member information, financial records, documents, and other materials created, uploaded, or stored by you or your organization through the Service.
      </p>

      <h2 style={s.h2}>2. Service Description</h2>
      <h3 style={s.h3}>2.1 What the Service Provides</h3>
      <p style={s.p}>GoodOfTheOrder is a web-based software-as-a-service (SaaS) platform that provides:</p>
      <ul style={s.ul}>
        <li style={s.li}>Meeting minutes creation and management</li>
        <li style={s.li}>Agenda creation and management</li>
        <li style={s.li}>Board member directory and attendance tracking</li>
        <li style={s.li}>PDF document generation from meeting records</li>
        <li style={s.li}>Email distribution of meeting minutes to board members</li>
        <li style={s.li}>Secure, organization-separated data storage</li>
      </ul>
      <p style={s.p}>
        The Service is designed for volunteer-run organizations including but not limited to Farm Bureaus, nonprofit boards, homeowner associations, and similar governance bodies.
      </p>
      <h3 style={s.h3}>2.2 Service Modifications</h3>
      <p style={s.p}>
        We reserve the right to modify, update, or discontinue features of the Service at any time, with or without notice.
        We will use reasonable efforts to notify customers of material changes. No modification will materially reduce the core functionality
        of the Service (meeting minutes creation, PDF generation, email distribution, and data storage) without at least 90 days' prior written notice
        and an opportunity for affected customers to export their data.
      </p>

      <h2 style={s.h2}>3. Accounts and Access</h2>
      <h3 style={s.h3}>3.1 Account Creation</h3>
      <p style={s.p}>
        To use the Service, you must create an account with a valid email address and verify that email address.
        You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
      </p>
      <h3 style={s.h3}>3.2 Organization Accounts</h3>
      <p style={s.p}>
        The Service is organized by organizations. Each organization has one or more administrators who can invite members,
        assign roles, and manage organizational settings. When you join an organization, you can access that organization's data
        according to your assigned role (Admin, Editor, or Viewer).
      </p>
      <h3 style={s.h3}>3.3 Account Eligibility</h3>
      <p style={s.p}>
        You must be at least 18 years old to create an account. By creating an account, you represent that the information you provide is accurate and complete.
      </p>

      <h2 style={s.h2}>4. Data Ownership and Your Content</h2>
      <h3 style={s.h3}>4.1 You Own Your Data</h3>
      <p style={s.p}>
        All Content you and your organization create using the Service belongs to you and your organization.
        We do not claim any ownership or intellectual property rights over your Content.
      </p>
      <h3 style={s.h3}>4.2 License to Operate</h3>
      <p style={s.p}>
        By using the Service, you grant us a limited license to store, process, display, and transmit your Content solely for the purpose of providing
        and improving the Service. This license ends when you delete your Content or close your account.
      </p>
      <h3 style={s.h3}>4.3 Aggregated and Anonymized Data</h3>
      <p style={s.p}>
        We may generate anonymized, aggregated statistical data derived from your use of the Service (for example, average meeting length across all customers,
        or total minutes created per month). This data cannot be used to identify you or your organization. We use aggregated data for internal analytics
        and general marketing statements that do not identify any customer. We do not sell or share individualized or identifiable usage data with any third party.
      </p>
      <h3 style={s.h3}>4.4 Data Portability</h3>
      <p style={s.p}>
        You may export your data at any time through the PDF generation features of the Service. We believe your data should never be held hostage.
        We are committed to providing reasonable data export mechanisms and will expand export capabilities (such as CSV or structured data export) as the Service develops.
      </p>

      <h2 style={s.h2}>5. Acceptable Use</h2>
      <p style={s.p}>You agree not to:</p>
      <ul style={s.ul}>
        <li style={s.li}>Use the Service for any unlawful purpose</li>
        <li style={s.li}>Attempt to access another organization's data or accounts</li>
        <li style={s.li}>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
        <li style={s.li}>Transmit malware, viruses, or any malicious code through the Service</li>
        <li style={s.li}>Use automated tools (bots, scrapers) to access the Service without our written permission</li>
        <li style={s.li}>Resell, sublicense, or redistribute access to the Service without our written agreement</li>
        <li style={s.li}>Store content that is illegal, defamatory, or infringes on third-party intellectual property rights</li>
        <li style={s.li}>Intentionally interfere with the Service's operation or other users' access</li>
      </ul>

      <h2 style={s.h2}>6. Intellectual Property</h2>
      <h3 style={s.h3}>6.1 Our Intellectual Property</h3>
      <p style={s.p}>
        The Service, as defined in Section 1, is owned by Riverhouse Farms LLC and is protected by copyright, trademark, and other intellectual property laws.
        "GoodOfTheOrder" and the GoodOfTheOrder logo are trademarks of Riverhouse Farms LLC. Nothing in these Terms grants you any right, title, or interest
        in our intellectual property except the limited right to use the Service as described herein.
      </p>
      <h3 style={s.h3}>6.2 License to Use the Service</h3>
      <p style={s.p}>
        Subject to your compliance with these Terms and payment of applicable fees, we grant you a limited, non-exclusive, non-transferable, revocable license
        to access and use the Service for your organization's internal governance purposes. This license does not include the right to sublicense, modify, adapt,
        or create derivative works of the Service.
      </p>
      <h3 style={s.h3}>6.3 Feedback</h3>
      <p style={s.p}>
        If you provide us with feedback, suggestions, or ideas about the Service, you grant us a non-exclusive, royalty-free, perpetual, and irrevocable right
        to use that feedback for any purpose, including to improve the Service. We are not obligated to implement any feedback, and providing feedback does not
        entitle you to any compensation or credit.
      </p>

    <h2 style={s.h2}>7. Subscription and Payment</h2>
      <h3 style={s.h3}>7.1 Pricing</h3>
      <p style={s.p}>The Service is offered under the following pricing tiers:</p>
      <ul style={s.ul}>
        <li style={s.li}><strong style={s.strong}>Monthly:</strong> $39 per month per organization, billed monthly. Cancel anytime.</li>
        <li style={s.li}><strong style={s.strong}>Annual:</strong> $348 per year per organization ($29 per month equivalent), billed annually. Save $120 per year compared to monthly billing.</li>
        <li style={s.li}><strong style={s.strong}>State Federation Bulk License:</strong> $15 per county or chapter per month ($180 per county per year), billed annually to the state federation. Available to state federations licensing the Service for all member counties or chapters.</li>
      </ul>
      <p style={s.p}>
        All tiers include unlimited users, unlimited meeting records, PDF export, email distribution, and support. We do not charge per seat or per user.
        We do not gate compliance-critical features behind higher pricing tiers.
      </p>
        All tiers include unlimited users, unlimited meeting records, PDF export, email distribution, and support. We do not charge per seat or per user.
        We do not gate compliance-critical features behind higher pricing tiers.
      </p>
      <h3 style={s.h3}>7.2 Payment Processing</h3>
      <p style={s.p}>
        Payments are processed through Stripe, Inc. By providing payment information, you agree to Stripe's terms of service.
        We do not store your credit card information on our servers.
      </p>
      <h3 style={s.h3}>7.3 Free Trial</h3>
      <p style={s.p}>
        New individual organization accounts receive a 14-day free trial period. No credit card is required for the trial.
        Federation bulk licenses may receive a 30-day pilot period for a limited number of counties. At the end of the trial period,
        you must subscribe to a paid plan to continue using the Service. We will notify you before your trial expires.
      </p>
      <h3 style={s.h3}>7.4 Auto-Renewal</h3>
      <p style={s.p}>
        All subscriptions automatically renew at the end of each billing period (monthly for individual organizations, annually for federation bulk licenses)
        at the then-current rate, unless you cancel before the renewal date. We will notify you at least 30 days before any price increase takes effect.
        You may cancel auto-renewal at any time through the Service or by contacting us at <a href="mailto:support@goodoftheorder.app" style={s.link}>support@goodoftheorder.app</a>.
        Cancellation of auto-renewal takes effect at the end of the current billing period.
      </p>
      <h3 style={s.h3}>7.5 Failed Payments</h3>
      <p style={s.p}>
        If a payment fails, we will notify you and provide a 7-day grace period. If payment is not resolved within 14 additional days, we may suspend your account.
        We will not delete your data due to a payment failure — suspended accounts retain all data and can be reactivated upon payment.
      </p>
      <h3 style={s.h3}>7.6 Refunds</h3>
      <p style={s.p}>
        Monthly subscriptions may be canceled at any time. We do not provide prorated refunds for partial months.
        Annual federation licenses are non-refundable after the first 30 days, except at our discretion.
      </p>

      <h2 style={s.h2}>8. Cancellation and Data Retention</h2>
      <h3 style={s.h3}>8.1 Cancellation by You</h3>
      <p style={s.p}>You may cancel your subscription at any time. Upon cancellation:</p>
      <ul style={s.ul}>
        <li style={s.li}>Your account remains accessible in read-only mode through the end of your current billing period</li>
        <li style={s.li}>You may export your data (via PDF generation) during this period</li>
        <li style={s.li}>After the billing period ends, your data will be retained for 30 days in case you change your mind</li>
        <li style={s.li}>After the 30-day retention period, your data will be permanently deleted from our systems</li>
      </ul>
      <h3 style={s.h3}>8.2 Cancellation by Us</h3>
      <p style={s.p}>
        We may suspend or terminate your account if you violate these Terms. In such cases, we will provide at least 14 days' notice
        (except in cases of illegal activity or security threats) and allow you to export your data before deletion.
      </p>
      <h3 style={s.h3}>8.3 Service Discontinuation</h3>
      <p style={s.p}>
        If we ever discontinue the Service entirely, we will provide at least 90 days' notice and ensure all customers can export their data before shutdown.
      </p>
      <p style={s.p}>
        You are responsible for exporting your Content during the notice period. We are not obligated to retain or provide Content after the stated retention period expires.
      </p>

      <h2 style={s.h2}>9. Security and Data Protection</h2>
      <p style={s.p}>We take the security of your data seriously:</p>
      <ul style={s.ul}>
        <li style={s.li}>All data is encrypted at rest using AES-256 encryption</li>
        <li style={s.li}>All data is encrypted in transit using TLS 1.2 or higher</li>
        <li style={s.li}>Each organization's data is isolated using database-level row-level security policies</li>
        <li style={s.li}>User roles (Admin, Editor, Viewer) control access within each organization</li>
        <li style={s.li}>Email verification is required before any data can be created or modified</li>
        <li style={s.li}>We maintain regular automated backups of all data</li>
      </ul>
      <h3 style={s.h3}>9.1 Breach Notification</h3>
      <p style={s.p}>
        In the event of a data breach that compromises the security, confidentiality, or integrity of your personal information, we will notify affected customers
        in the most expedient time possible and without unreasonable delay, and no later than 30 calendar days after discovery of the breach. Notification will include:
        the types of information involved, the time frame of exposure if known, steps we have taken to contain the breach, and steps you can take to protect yourself.
      </p>
      <p style={s.p}>
        If a breach affects more than 500 Washington state residents, we will also notify the Washington State Attorney General within 30 days of discovery, as required by RCW 19.255.010.
      </p>

      <h2 style={s.h2}>10. Third-Party Services</h2>
      <p style={s.p}>The Service relies on the following third-party providers to operate:</p>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Provider</th>
            <th style={s.th}>Purpose</th>
            <th style={s.th}>Data Accessed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={s.td}>Supabase (AWS)</td>
            <td style={s.td}>Database hosting and authentication</td>
            <td style={s.td}>All application data (encrypted)</td>
          </tr>
          <tr>
            <td style={s.td}>Vercel</td>
            <td style={s.td}>Application hosting and delivery</td>
            <td style={s.td}>No persistent data storage</td>
          </tr>
          <tr>
            <td style={s.td}>Resend</td>
            <td style={s.td}>Email delivery</td>
            <td style={s.td}>Recipient emails and email content</td>
          </tr>
          <tr>
            <td style={s.td}>Stripe</td>
            <td style={s.td}>Payment processing</td>
            <td style={s.td}>Billing info (not stored by us)</td>
          </tr>
          <tr>
            <td style={s.td}>Sentry</td>
            <td style={s.td}>Error tracking</td>
            <td style={s.td}>Browser info, error details (no meeting content)</td>
          </tr>
        </tbody>
      </table>
      <p style={s.callout}>
        We do not sell, rent, or share your data with any third party for marketing or advertising purposes. Ever.
      </p>

      <h2 style={s.h2}>11. Limitation of Liability</h2>
      <p style={s.p}>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM OR RELATED TO THE SERVICE
        SHALL NOT EXCEED THE TOTAL AMOUNT YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
      </p>
      <p style={s.p}>
        WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
        LOSS OF DATA, LOSS OF REVENUE, OR INTERRUPTION OF BUSINESS, REGARDLESS OF WHETHER WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </p>
      <h3 style={s.h3}>11.1 Exceptions to Limitation</h3>
      <p style={s.p}>
        Nothing in these Terms limits or excludes liability for gross negligence, willful misconduct, fraud, or any liability that cannot be lawfully limited or excluded under applicable law.
      </p>
      <p style={s.p}>
        The Service is provided for governance record-keeping purposes. We do not provide legal advice, and meeting minutes created using the Service do not constitute legal documents
        unless otherwise required by your organization's governing laws.
      </p>

      <h2 style={s.h2}>12. Disclaimer of Warranties</h2>
      <p style={s.p}>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
        WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>
      <p style={s.p}>
        We do not warrant that the Service will be uninterrupted, error-free, or secure at all times. We make reasonable efforts to maintain uptime and will communicate any planned maintenance in advance.
      </p>

      <h2 style={s.h2}>13. Indemnification</h2>
      <p style={s.p}>
        You agree to indemnify, defend, and hold us harmless from any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of or related to:
        (a) your breach of these Terms; (b) your misuse of the Service in violation of applicable law; (c) your organization's Content stored on the Service;
        or (d) your infringement of any third-party intellectual property or other rights.
      </p>

      <h2 style={s.h2}>14. Dispute Resolution</h2>
      <p style={s.p}>
        These Terms are governed by the laws of the State of Washington, without regard to conflict of law principles.
      </p>
      <p style={s.p}>
        Any dispute arising from these Terms or the Service shall first be addressed through good-faith negotiation between the parties for a period of at least 30 days.
        If negotiation fails, binding arbitration in the State of Washington under the rules of the American Arbitration Association shall be the exclusive means of resolving the dispute.
      </p>
      <p style={s.p}>
        Nothing in this section prevents either party from seeking injunctive relief in a court of competent jurisdiction to protect intellectual property rights or prevent irreparable harm.
      </p>
      <h3 style={s.h3}>14.1 Class Action Waiver</h3>
      <p style={s.p}>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU AND WE EACH AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS
        AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. If for any reason a claim proceeds in court rather than in arbitration, both you and we waive any right to a jury trial.
      </p>

      <h2 style={s.h2}>15. Privacy Policy</h2>
      <p style={s.p}>
        Our <a href="/privacy" style={s.link}>Privacy Policy</a>, available at https://goodoftheorder.app/privacy, describes how we collect, use, store, and protect your information.
        The Privacy Policy is incorporated into these Terms by reference. By using the Service, you acknowledge that you have read and understood the Privacy Policy
        and consent to the data practices described therein.
      </p>
      <p style={s.p}>
        In the event of a conflict between these Terms and the Privacy Policy regarding the handling of your data, the Privacy Policy shall control.
      </p>

      <h2 style={s.h2}>16. Changes to These Terms</h2>
      <p style={s.p}>We may update these Terms from time to time. When we make material changes:</p>
      <ul style={s.ul}>
        <li style={s.li}>We will update the "Last Updated" date at the top of this page</li>
        <li style={s.li}>We will notify all registered account holders via email at least 30 days before the changes take effect</li>
        <li style={s.li}>Continued use of the Service after the effective date constitutes acceptance of the updated Terms</li>
        <li style={s.li}>If you disagree with the changes, you may cancel your account and export your data before the effective date</li>
      </ul>

      <h2 style={s.h2}>17. General Provisions</h2>
      <h3 style={s.h3}>17.1 Severability</h3>
      <p style={s.p}>
        If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited
        or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
      </p>
      <h3 style={s.h3}>17.2 Force Majeure</h3>
      <p style={s.p}>
        Neither party shall be liable for any failure or delay in performance due to causes beyond its reasonable control, including but not limited to
        acts of God, natural disasters, pandemics, power outages, internet service disruptions, government actions, labor disputes, or third-party service provider failures.
        The affected party shall notify the other party promptly and use reasonable efforts to mitigate the impact. Such delay or failure shall not constitute a breach of these Terms.
      </p>
      <h3 style={s.h3}>17.3 Assignment</h3>
      <p style={s.p}>
        You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign these Terms in connection with
        a merger, acquisition, reorganization, or sale of all or substantially all of our assets, provided that the assignee agrees to be bound by these Terms.
        Any attempted assignment in violation of this section is void.
      </p>
      <h3 style={s.h3}>17.4 Waiver</h3>
      <p style={s.p}>
        The failure of either party to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.
        Any waiver will be effective only if in writing and signed by the waiving party.
      </p>
      <h3 style={s.h3}>17.5 Entire Agreement</h3>
      <p style={s.p}>
        These Terms, together with the Privacy Policy and any applicable order forms or federation licensing agreements, constitute the entire agreement between you and us
        regarding the Service and supersede all prior or contemporaneous agreements, representations, warranties, and understandings.
      </p>
      <h3 style={s.h3}>17.6 Governing Language</h3>
      <p style={s.p}>
        These Terms are written in English, which shall be the controlling language. Any translations are provided for convenience only.
      </p>
      <h3 style={s.h3}>17.7 Notices</h3>
      <p style={s.p}>
        Notices to you will be sent to the email address associated with your account. Notices to us should be sent to{' '}
        <a href="mailto:support@goodoftheorder.app" style={s.link}>support@goodoftheorder.app</a>. A notice is deemed delivered when sent by email.
      </p>
      <h3 style={s.h3}>17.8 Headings</h3>
      <p style={s.p}>Section headings are for convenience only and do not affect the interpretation of these Terms.</p>
      <h3 style={s.h3}>17.9 No Third-Party Beneficiaries</h3>
      <p style={s.p}>
        These Terms are for the sole benefit of you and us and do not create any rights in favor of any third party, including members of your Organization,
        vendors, or other stakeholders.
      </p>

      <h2 style={s.h2}>18. Contact Information</h2>
      <p style={s.p}>If you have questions about these Terms, please contact us at:</p>
      <p style={s.p}>
        <strong style={s.strong}>Riverhouse Farms LLC</strong><br />
        Email: <a href="mailto:support@goodoftheorder.app" style={s.link}>support@goodoftheorder.app</a><br />
        Website: <a href="https://goodoftheorder.app" style={s.link}>https://goodoftheorder.app</a>
      </p>
    </LegalLayout>
  );
}

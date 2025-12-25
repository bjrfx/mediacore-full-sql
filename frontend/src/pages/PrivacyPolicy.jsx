import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, FileText } from 'lucide-react';

const sections = [
  {
    id: 'intro',
    title: 'Overview',
    content: [
      'This Privacy Policy explains how MediaCore ("we", "us") collects, uses, shares, and protects information when you use MediaCore (the "Service") on web or mobile clients. By using the Service, you consent to these practices; if you do not agree, please stop using the Service.',
    ],
  },
  {
    id: 'effective-dates',
    title: 'Effective Dates',
    content: [
      'Effective Date: [December 25, 2025]',
      'Last Updated: [December 25, 2025]',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: [
      'We collect information to operate MediaCore, provide secure access, and improve functionality.',
    ],
    bullets: [
      'Account Information: Email, display name, and (if you use Google Sign-In) Google OAuth identifiers (for example, google_id) and profile photo URL. Passwords are stored as secure hashes.',
      'Authentication Tokens: Access and refresh tokens (JWT). The frontend stores tokens in localStorage; the backend stores refresh tokens in MySQL for session management.',
      'Usage and Analytics Data: Request and usage logs in MySQL may include IP address, user agent (device/browser), referrer, endpoints accessed, response status/time, geographic attribution derived from IP, and timestamps. We track online presence and last activity time for admin analytics.',
      'Subscription and Playback Data: Subscription tier, playback limits, session start time, and related usage needed to enforce tier policies. Some of this may be cached locally (for example, localStorage) for performance.',
      'Content and Files: If you upload or manage media, we store file metadata (paths, sizes, types, thumbnails, subtitles) and associate files to artists or albums.',
      'Push Notifications: If enabled, we store web push subscription details to deliver notifications.',
      'Preferences and Local Cache: UI preferences, playback history or queue, recent searches, and cached data may be stored in your browser storage. You can clear this within Settings.',
      'Cookies: We primarily rely on JWT tokens in localStorage. Limited cookies may be used for security, rate limiting, or preference storage.',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Information',
    bullets: [
      'Provide and maintain the Service: Authenticate users, serve media, and enforce subscription tiers and playback limits.',
      'Security and abuse prevention: Verify identities, detect fraud or abuse, and protect accounts and infrastructure.',
      'Analytics and improvements: Measure usage, performance, and reliability to improve features and UI.',
      'Communications: Send transactional messages (for example, password resets) and service notifications.',
      'Legal compliance: Comply with applicable laws and respond to lawful requests.',
    ],
  },
  {
    id: 'legal-bases',
    title: 'Legal Bases (EEA/UK)',
    bullets: [
      'Performance of a contract: To provide the Service.',
      'Legitimate interests: Security and analytics.',
      'Consent: Optional features like push notifications.',
      'Legal obligations: Compliance with applicable law.',
    ],
  },
  {
    id: 'sharing',
    title: 'Data Sharing and Disclosure',
    content: ['We do not sell personal information. We may share information with:'],
    bullets: [
      'Service Providers: Hosting, storage, analytics, logging, and support vendors acting on our behalf under contractual safeguards.',
      'Authentication Providers: Google OAuth (if you choose to sign in with Google) to verify tokens and link accounts.',
      'Legal and Safety: Authorities or third parties when required by law or to protect rights, safety, and security.',
      'Business Transfers: In connection with mergers, acquisitions, or asset transfers, subject to continued protections.',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    bullets: [
      'Tokens: Access tokens are short lived; refresh tokens typically expire in about seven days. Expired or invalid tokens may be purged.',
      'Logs and Analytics: Retained for a period necessary for security, debugging, and analytics (for example, 90 to 365 days).',
      'Content and Accounts: Retained while your account is active or as required by law.',
    ],
    content: ['You can clear local cached data from the app (Settings -> Clear Data) and request account deletion as described below.'],
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: ['Subject to applicable law, you may have rights to:'],
    bullets: [
      'Access or Portability: Obtain a copy of your data.',
      'Rectification: Correct inaccurate information.',
      'Erasure: Request deletion of your account and associated personal data.',
      'Restriction or Object: Limit certain processing or object to processing based on legitimate interests.',
      'Consent Withdrawal: Withdraw consent for optional features (for example, push notifications).',
    ],
    footer: 'To exercise rights, contact us at contact@mediacore.in. We may need to verify your identity.',
  },
  {
    id: 'security',
    title: 'Security',
    content: [
      'We use technical and organizational measures (for example, hashed passwords, token verification, restricted database access) to protect information. No system is 100% secure; please keep your credentials safe.',
    ],
  },
  {
    id: 'children',
    title: 'Children’s Privacy',
    content: [
      'MediaCore is not directed to children under 13 (or the age of digital consent in your jurisdiction). We do not knowingly collect personal information from children.',
    ],
  },
  {
    id: 'international',
    title: 'International Transfers',
    content: [
      'Your data may be processed in regions where our servers or providers operate (for example, Canada or India). We implement safeguards for cross-border transfers as required by law.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: [
      'We may update this Policy from time to time. The Last Updated date will reflect changes. Continued use of the Service constitutes acceptance of the updated Policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: [
      'MediaCore',
      'Hyderabad, Telangana, India.',
      'Email: contact@mediacore.in',
      'For EU/UK residents: You may have the right to lodge a complaint with your local supervisory authority.',
    ],
  },
];

const anchorClass =
  'text-sm text-muted-foreground hover:text-primary transition-colors block py-1';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-full px-6 py-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm">
              How we collect, use, and protect your information.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-primary" aria-hidden />
                <div>
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  {section.content &&
                    section.content.map((paragraph, idx) => (
                      <p key={idx} className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  {section.bullets && (
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                      {section.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {section.footer && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {section.footer}
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-8 h-fit rounded-xl border bg-card shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">On this page</p>
          </div>
          <nav className="p-4 space-y-2">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className={anchorClass}>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="px-4 pb-4">
            <div className="mt-2 text-xs text-muted-foreground">
              {/* Replace placeholders (MediaCore, contact@mediacore.in, Greater Hyderabad Municipal Corporation (GHMC), [Venue], Hyderabad, Telangana, India.) with your real details. */}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

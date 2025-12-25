import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, FileText } from 'lucide-react';

const sections = [
  {
    id: 'intro',
    title: 'Overview',
    content: [
      'These Terms of Service ("Terms") govern your access to and use of MediaCore (the "Service") provided by MediaCore. By using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Service.',
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
    id: 'eligibility',
    title: 'Eligibility and Accounts',
    bullets: [
      'You must be capable of forming a binding contract and comply with applicable laws.',
      'You are responsible for maintaining accurate account information and safeguarding your credentials.',
      'You may sign in via email/password or Google OAuth. If you use Google, you authorize us to verify your token and link your Google account to your MediaCore account.',
    ],
  },
  {
    id: 'access',
    title: 'Access, Subscriptions, and Limits',
    bullets: [
      'We offer tiered access (for example, Guest, Free, Premium, Premium Plus, Enterprise) with different features and playback limits.',
      'Playback time and language access may be restricted per tier. Circumventing limits (for example, via automation or tampering) is prohibited.',
      'Tier features, pricing, and availability may change. If billing is offered, subscription terms, charges, taxes, and refund policy will be provided separately.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: ['You agree not to:'],
    bullets: [
      'Use the Service for unlawful, harmful, fraudulent, infringing, or abusive activities.',
      'Upload or distribute content you do not have rights to or that violates third-party intellectual property, privacy, or publicity rights.',
      'Reverse engineer, interfere with, or attempt to bypass security, playback limits, or access controls.',
      'Scrape, harvest, or misuse API endpoints or analytics features.',
      'Transmit malware or disrupt networks or servers.',
    ],
    footer: 'We may suspend or terminate accounts that violate these Terms.',
  },
  {
    id: 'content-license',
    title: 'Content and Licenses',
    bullets: [
      'Your Content: If you upload media or metadata (for example, tracks, HLS segments, thumbnails, subtitles), you represent and warrant you have the necessary rights and licenses.',
      'You grant us a non-exclusive, worldwide license to host, store, reproduce, adapt, and display your content as necessary to operate the Service.',
      'We may remove or disable content that we reasonably believe violates these Terms or applicable law.',
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics and Logging',
    content: [
      'We log usage data (for example, IP, user agent, referrer, endpoints accessed, response metrics, geographic attribution) to ensure security, monitor performance, and improve the Service. Admin users may view session data (for example, last active, device or browser, rough location) for support and moderation.',
    ],
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    content: [
      'The Service may integrate with third-party services (for example, Google OAuth). Use of third-party services is subject to their terms and privacy policies. We are not responsible for third-party services.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    content: [
      'By using the Service, you agree to our Privacy Policy, which explains how we collect and use data. See the Privacy Policy for details on tokens, logs, analytics, cookies or localStorage, and data rights.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to the Service',
    content: [
      'We may update, modify, or discontinue features at any time without liability. We will strive to provide notice of major changes that materially impact users.',
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    content: [
      'The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee uninterrupted or error-free operation.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: [
      'To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or loss of data, profits, or business, arising from or related to your use of the Service. Our total liability for any claim will not exceed the amounts paid by you (if any) for the Service during the 12 months prior to the event giving rise to the claim.',
    ],
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: [
      'You will indemnify and hold harmless MediaCore, its affiliates, and personnel from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorney fees) arising from your content, your use of the Service, or your violation of these Terms or applicable law.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    content: [
      'We may suspend or terminate your access immediately if you violate these Terms or if necessary to protect the Service or users. Upon termination, your rights under these Terms will end, but provisions intended to survive (for example, ownership, disclaimers, limitation of liability, indemnification) will remain in effect.',
    ],
  },
  {
    id: 'law',
    title: 'Governing Law and Disputes',
    content: [
      'These Terms are governed by the laws of Greater Hyderabad Municipal Corporation (GHMC), without regard to conflict-of-laws principles. Exclusive venue for disputes is the courts located in [Venue]. You agree to the jurisdiction of these courts.',
    ],
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to These Terms',
    content: [
      'We may update these Terms from time to time. The Last Updated date will reflect changes. Continued use of the Service after changes take effect constitutes acceptance.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    content: [
      'MediaCore',
      'Hyderabad, Telangana, India.',
      'Email: contact@mediacore.in',
    ],
  },
];

const anchorClass =
  'text-sm text-muted-foreground hover:text-primary transition-colors block py-1';

export default function TermsOfService() {
  return (
    <div className="min-h-full px-6 py-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground text-sm">
              The rules for using MediaCore.
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

# Privacy Policy

Effective Date: [December 25, 2025]
Last Updated: [December 25, 2025]

This Privacy Policy describes how [Company Name] ("we", "us", "our") collects, uses, discloses, and protects information when you use MediaCore (the "Service"), including our web and mobile clients.

By using the Service, you consent to the data practices described in this Policy. If you do not agree, please do not use the Service.

## Information We Collect

We collect information to operate MediaCore, provide secure access, and improve functionality.

- **Account Information:** Email address, display name, and (if you use Google Sign‑In) Google OAuth profile identifiers (e.g., `google_id`) and profile photo URL. Passwords are stored as secure hashes.
- **Authentication Tokens:** We issue access and refresh tokens for authentication (JWT). The frontend stores access/refresh tokens in localStorage; the backend stores refresh tokens in MySQL for session management.
- **Usage & Analytics Data:** We log request and usage data to MySQL, which may include IP address, user agent (device/browser), referrer, endpoint accessed, response status/time, geographic attribution derived from IP, and timestamps. We also track online presence and last activity time for admin analytics.
- **Subscription & Playback Data:** Subscription tier, playback limits, session start time, and related usage needed to enforce tier policies. Some of this is cached locally (e.g., in localStorage) for performance.
- **Content & Files:** If you upload or manage media, we store file metadata (paths, sizes, types, thumbnails, subtitles) and associate files to artists/albums.
- **Push Notifications:** If enabled, we store web push subscription details to deliver notifications.
- **Preferences & Local Cache:** UI preferences, playback history/queue, recent searches, and cached data may be stored in your browser’s localStorage/sessionStorage. You can clear this within the app settings.
- **Cookies:** We primarily rely on JWT tokens in localStorage. Limited cookies may be used for security, rate‑limiting, or preference storage.

## How We Use Information

- **Provide & Maintain the Service:** Authenticate users, serve media, enforce subscription tiers and playback limits.
- **Security & Abuse Prevention:** Verify identities, detect fraud/abuse, and protect accounts and infrastructure.
- **Analytics & Improvements:** Measure usage, performance, and reliability to improve features and UI.
- **Communications:** Send transactional messages (e.g., password resets) and service notifications.
- **Legal Compliance:** Comply with applicable laws and respond to lawful requests.

## Legal Bases (EEA/UK users)

Where applicable, we rely on: performance of a contract (to provide the Service), legitimate interests (security, analytics), consent (optional features like push notifications), and compliance with legal obligations.

## Data Sharing & Disclosure

We do not sell personal information. We may share information with:

- **Service Providers:** Hosting, storage, analytics, logging, and support vendors acting on our behalf under contractual safeguards.
- **Authentication Providers:** Google OAuth (if you choose to sign in with Google) to verify tokens and link accounts.
- **Legal & Safety:** Authorities or third parties when required by law or to protect rights, safety, and security.
- **Business Transfers:** In connection with mergers, acquisitions, or asset transfers, subject to continued protections.

## Data Retention

- **Tokens:** Access tokens are short‑lived; refresh tokens typically expire in ~7 days. Expired/invalid tokens may be purged.
- **Logs & Analytics:** Retained for a period necessary for security, debugging, and analytics (e.g., 90–365 days).
- **Content & Accounts:** Retained while your account is active or as required by law.

You can clear local cached data from the app (Settings → Clear Data), and request account deletion as described below.

## Your Rights

Subject to applicable law, you may have rights to:

- **Access/Portability:** Obtain a copy of your data.
- **Rectification:** Correct inaccurate information.
- **Erasure:** Request deletion of your account and associated personal data.
- **Restriction/Object:** Limit certain processing or object to processing based on legitimate interests.
- **Consent Withdrawal:** Withdraw consent for optional features (e.g., push notifications).

To exercise rights, contact us at [Contact Email]. We may need to verify your identity.

## Security

We use technical and organizational measures (e.g., hashed passwords, token verification, restricted database access) to protect information. No system is 100% secure; please keep your credentials safe.

## Children’s Privacy

MediaCore is not directed to children under 13 (or the age of digital consent in your jurisdiction). We do not knowingly collect personal information from children.

## International Transfers

Your data may be processed in regions where our servers or providers operate (e.g., Canada/India). We implement safeguards for cross‑border transfers as required by law.

## Changes to This Policy

We may update this Policy from time to time. The "Last Updated" date will reflect changes. Continued use of the Service constitutes acceptance of the updated Policy.

## Contact Us

[Company Name]
[Business Address]
Email: [Contact Email]

For EU/UK residents: You may have the right to lodge a complaint with your local supervisory authority.

---

Notes for Implementation:
- Replace placeholders ([Company Name], [Contact Email], [Business Address]) and adjust retention periods.
- If you add external analytics (e.g., Google Analytics), payment processors, or CDNs, list them under Service Providers.
- If you switch to cookies for tokens, update the Cookies section accordingly.

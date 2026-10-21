# MASTER PROJECT PROMPT: Privacy-First Random Video Chat and Creator Marketplace

## Your Role

Act as a senior MERN stack architect, React developer, WebRTC engineer, payment systems engineer, cybersecurity specialist, trust-and-safety architect, UI/UX designer, QA engineer, and product strategist.

Build an original, production-oriented social discovery and random video chat platform inspired by publicly described social discovery features of Togilo.com. Do not copy its branding, proprietary assets, or assume access to its private implementation.

The platform connects eligible adult users with other users and voluntarily participating, verified adult creators. Users receive one limited free video call every six hours and may purchase credits for paid creator calls. Creators can earn transparent commissions from eligible paid sessions.

Prioritize user safety, creator consent, reliable calls, privacy, fair monetization, and a maintainable architecture.

## 1. Technology Stack

Frontend:
- React with Vite
- JavaScript initially, or TypeScript consistently across the project
- Tailwind CSS v3
- React Router
- TanStack Query or a consistent API-state strategy
- Socket.IO Client
- WebRTC APIs
- Accessible component system
- Responsive desktop and mobile design

Backend:
- Node.js
- Express
- MongoDB Atlas
- Mongoose
- Socket.IO
- Redis for distributed queues, rate limits, and short-lived coordination where necessary
- JWT or secure session authentication using appropriately configured HttpOnly cookies
- bcrypt or Argon2 password hashing
- Razorpay for India-supported payment flows, subject to current merchant and platform eligibility
- A suitable STUN/TURN service for WebRTC connectivity
- A vetted moderation provider behind a replaceable adapter interface

Deployment:
- Frontend: Vercel
- Backend: Render or another suitable Node.js host
- Database: MongoDB Atlas
- Redis: a compatible managed Redis service
- TURN: a reliable managed service or securely configured coturn deployment

Do not require AWS or Cloudinary. Explain alternatives for image storage, email delivery, monitoring, and other external services.

Use environment variables for all secrets. Commit only `.env.example` with placeholders.

## 2. Product Roles

Implement distinct roles and permissions:

1. Visitor: can browse public marketing pages and policies.
2. Registered user: can manage a profile, discover people, use eligible free calls, purchase credits, report and block users.
3. Verified creator: can manage availability, accept eligible paid calls, view earnings and request payouts.
4. Support staff: can handle ordinary support tickets without unrestricted access to sensitive moderation data.
5. Safety moderator: can access authorized reports, incidents and permitted moderation actions.
6. Senior moderator: can review escalations and appeals with additional permissions.
7. Finance administrator: can review payments, refunds, earnings and payout records.
8. System administrator: can manage configuration and technical access, but must not automatically gain unrestricted access to private calls or identity documents.

Use server-side RBAC permissions. Never trust a role supplied by the frontend.

## 3. Main Website Pages

Public pages:
- Home
- How It Works
- Discover
- Pricing
- Creator Program
- Become a Creator
- Safety Center
- Community Guidelines
- Privacy Policy
- Terms of Service
- Help and Contact

Authentication:
- Register
- Login
- Email or phone verification
- Forgot password
- Reset password
- Adult eligibility and verification flow
- Secure logout
- Session/device management

User dashboard:
- Profile
- Discovery and random matching
- Language and interest preferences
- Online people or approved creator listings
- Call waiting screen
- Video-call interface
- Free-call eligibility countdown
- Wallet and credit purchase
- Subscription management
- Call history using minimal necessary metadata
- Favorites
- Notifications
- Reports and blocked accounts
- Privacy and account deletion settings

Creator dashboard:
- Creator application
- Identity and age verification status
- Approval status and community guidelines
- Profile and introduction
- Availability controls
- Incoming call requests
- Transparent rate settings within platform limits
- Call history
- Pending, available and paid earning balances
- Commission details
- Payout requests
- Refund and dispute information
- Safety controls, reports and blocks
- Account deletion and support

Admin dashboard:
- User management
- Creator applications and verification status
- Reports and moderation queue
- Safety incidents and escalations
- Restricted, suspended and banned accounts
- Payment transactions, refunds and disputes
- Creator commissions and payout requests
- Free-call usage and promotional expenses
- Referral abuse review
- Operational analytics
- Audit logs
- Configurable policies
- Role and permission management

## 4. End-to-End User Workflow

1. Visitor lands on the website.
2. Visitor reviews how the service works, pricing, privacy and safety rules.
3. User registers and verifies the account.
4. Server checks adult eligibility and any verification requirements applicable to the user's intended features.
5. User creates a profile and chooses optional language and interest preferences.
6. User selects random matching or an available creator.
7. Backend checks eligibility, blocks, account restrictions, availability and free-call or paid-call rules.
8. Before connecting, display the call type, free-call duration or paid rate, safety notice and relevant moderation disclosure.
9. User enters a waiting queue or sends a call request to a creator.
10. Matching service chooses an eligible participant and prevents duplicate or conflicting matches.
11. Backend authorizes the session and creates a unique call session.
12. Socket.IO exchanges authenticated WebRTC signaling messages.
13. WebRTC establishes the audio/video connection using appropriate ICE servers.
14. Backend tracks call state and duration.
15. Call ends on participant action, timeout, disconnection, moderation intervention or technical failure.
16. Backend settles the session according to its free or paid status.
17. Frontend displays the outcome, next free-call eligibility time when relevant, and a report/block option.
18. Users may return, discover more profiles, subscribe, purchase credits or participate in a referral program without forced purchases.

## 5. Free-Call Rules

Initial configurable defaults:
- One free call per user per six-hour cooldown.
- Two minutes of free-call time per eligible session.
- No paid-wallet deduction for a free call.
- Cooldown is enforced by the backend, never only by the browser.

Required implementation:
- Store timestamps in UTC.
- Display dates and countdowns in the user's local timezone.
- Reserve a free-call claim atomically to prevent simultaneous claims across tabs, devices or backend instances.
- Define precisely when a claim becomes consumed.
- Recommended policy: consume the allowance when a valid call connection is established, rather than when the user merely enters the queue.
- Establish a documented retry rule for failed connections. Genuine technical failures before connection should not unfairly consume the allowance.
- Start the duration timer on successful connection.
- Enforce the maximum duration on the backend.
- Disconnect or end the session when the limit is reached.
- Never trust frontend countdown values.
- Return the next eligible time from the server.
- Clean up abandoned reservations safely.
- Add rate limits and fraud checks for duplicate registrations and automated account creation.

Make free-call duration, cooldown and daily limits configurable independently.

Do not let changing the policy accidentally alter paid-call settlement rules.

If free calls involve creators, define whether the platform compensates them. If it does, record the expense against a dedicated promotional budget and a separate earnings ledger. Never represent promotional expenditure as paid user revenue.

## 6. Creator Recruitment and Lifecycle

Create a voluntary creator program:
1. Adult visitor reads creator terms, commission, payout rules and safety requirements.
2. Applicant registers and completes required age and identity verification through a suitable provider or reviewed process.
3. Platform reviews the application and required eligibility checks.
4. Approved creator completes the profile and pricing setup.
5. Creator chooses when to be available.
6. User requests a call at the disclosed rate.
7. Creator can accept or decline.
8. Backend validates session membership, credits and creator availability.
9. Call starts and the server tracks its duration.
10. Backend calculates the charge and creator share using the disclosed commission policy.
11. Creator views the earnings entry and can request a payout once eligible.
12. Platform processes eligible payouts after verification and applicable checks.

Never promise guaranteed income. Do not force creators to remain online or accept calls. Clearly explain platform fees, refunds, chargebacks, payout thresholds, settlement periods and any applicable tax or compliance obligations.

Use a transparent policy for cancellations, disconnections, disputes and refunds.

## 7. Matching and WebRTC Architecture

Support:
- Random one-to-one matching
- Approved creator discovery
- Language and interest preferences
- Online/offline availability
- Busy-user exclusion
- Block-list enforcement
- Queue cancellation
- Duplicate-match prevention
- Connection timeout and retry
- Socket disconnect cleanup
- Reconnection handling
- Fair matching
- Rate limits and abuse prevention

Socket.IO must be used for signaling, presence and call state, not as the audio/video media transport.

WebRTC carries media between participants or through a TURN relay. Configure ICE servers securely. Authenticate every signaling action and verify that the sender belongs to the call session.

Use short-lived session authorization, rate-limited signaling, and validation for offer, answer and ICE candidate messages.

Do not expose arbitrary room joining. Do not allow a client to join another user's private call by guessing a room ID.

Use Redis-backed coordination and a compatible Socket.IO adapter when scaling to multiple backend instances.

Document peer-to-peer IP exposure and TURN relay trade-offs. Use TURN relay-only mode if the product requires hiding participants' direct network addresses from one another, while explaining the added bandwidth and infrastructure costs.

## 8. Privacy and Recording Policy

The platform must not implement call recording or persistent call-media storage.

Requirements:
- Do not implement MediaRecorder-based call recording.
- Do not save call video, audio chunks, screenshots or sampled frames as a default feature.
- Do not create hidden recordings.
- Do not claim that users can never record a screen or use external devices.
- Display clear privacy and moderation notices before calls.
- Use secure transport, authenticated signaling and session authorization.
- Keep public profiles separate from identity verification records.
- Minimize IP, location and identity data collection.
- Restrict access to sensitive records.
- Provide account data access and deletion workflows where applicable.
- Publish retention periods for session, payment and moderation metadata.
- Apply legal holds only when properly authorized.
- Document the limitations of end-to-end encryption if it is offered.

The application may process transient signals for safety classification only if the processing is disclosed and appropriately reviewed. Avoid storing media. If any temporary frame sampling is necessary, define its purpose, frequency, access, deletion, legal basis and user notice before enabling it.

## 9. Safety, Live Moderation and Adult-Content Prevention

Build this as an independent Safety module integrated with authentication, matching, WebRTC signaling, Socket.IO and admin permissions.

Safety requirements:
- Publish clear community guidelines and prohibited-content rules.
- Prohibit sexual exploitation, sexual content involving minors, non-consensual sexual behaviour, sexual harassment, coercion, threats and other content prohibited by platform policy.
- Verify adult eligibility before granting access to restricted features.
- Verify creator age and identity before enabling monetization.
- Provide report and block controls during and after calls.
- Let either participant end a call immediately.
- Allow users to report suspected prohibited content.
- Use a replaceable moderation-provider interface for supported automated safety signals.
- Support escalation, human review, appeal and account reinstatement.

Live moderation privacy:
- Never build a hidden administrator backdoor into WebRTC sessions.
- Disclose automated checks and the possibility of human live moderation before calls.
- A moderator may join or review a live session only under a clearly disclosed, legally reviewed policy and with appropriate notice and consent where required.
- Display a visible moderation indicator whenever a human moderator joins.
- Do not capture or archive live media by default.
- Automated classifiers are signals, not definitive proof.
- Provide human review for serious enforcement and an appeal process.
- Do not expose a reporter's identity to the reported user unless disclosure is legally required.

Safety actions:
- Guideline reminder
- Warning
- End current call
- Temporarily restrict matching or calling
- Suspend an account pending review
- Ban an account after appropriate review
- Escalate credible exploitation or imminent-danger reports under applicable law and documented procedures
- Accept appeals and record the outcome

Admin access:
- Require strong authentication and MFA for privileged accounts.
- Separate report viewing, live-session moderation, account suspension and record-export permissions.
- Use just-in-time authorization for exceptional sensitive access.
- Require a reason for each sensitive access request.
- Record access and enforcement actions in tamper-resistant audit logs.
- Periodically review administrator permissions.
- Alert on suspicious access patterns.
- Never grant unrestricted access to private calls or identity documents.

Do not assume automated nudity detection can reliably identify every prohibited incident. Configure thresholds carefully, account for false positives and discrimination risks, and provide a human review process.

## 10. Payment and Creator-Earnings Architecture

Implement:
- Credit purchases
- Paid-call rate confirmation
- Premium subscriptions
- Payment history and receipts
- Creator commission calculation
- Refunds and disputes
- Payout requests
- Reconciliation and financial audit logs

Required payment safeguards:
- Verify payment status on the backend.
- Validate provider signatures and webhook authenticity.
- Never trust a frontend payment-success message.
- Use idempotency keys for payment processing and settlement.
- Reserve sufficient credits before starting a paid call.
- Use server timestamps for billable duration.
- Define billing increments, rounding, grace periods and maximum charges before the user confirms.
- Settle once only, even if multiple disconnect or webhook events arrive.
- Release unused reservations or refund according to the published policy.
- Maintain an immutable financial transaction ledger.
- Track user credits, platform revenue, creator earnings, promotional expenses and payouts separately.
- Prevent negative balances, duplicate payouts and unauthorized balance changes.
- Provide customer support for disputed transactions.

Do not pay out funds based
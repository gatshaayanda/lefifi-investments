# Lefifi Investments — Project Operating Contract

## Product
- Repository: gatshaayanda/lefifi-investments
- Branch: main
- Foundation: Iteration 13 baseline 8cab59b; selected explicitly by the product owner.
- Business: Lefifi Investments, Gaborone, Botswana. Event planning/management, furniture and styling, indoor/outdoor LED screens, sound, lighting, stage design/production, and mobile toilet/equipment hire.
- Customer dealings and enquiries are handled through the app. Do not publish business phone/call/WhatsApp contact routes. Customer phone capture on an enquiry is retained for request fulfilment.
- Firebase project: learn-fx-trading-bw-academy.
- Uploads: UploadThing only. Firebase Storage is not configured or deployed.

## Architecture and journeys
- src/app/page.tsx: mobile-first public discovery, compact service shortcuts, a live Firestore service catalogue with six editable single-price starter entries, service selection that prefills the correct event/rental form field, and real Firestore event enquiry/equipment hire submissions. Matched editable catalogue base prices are saved as clearly labelled price references with the request; they are not confirmed quotes. Successful submissions navigate directly to `/account?submitted={recordId}`. Offline submissions are not queued.
- src/app/account/page.tsx: customer workspace opened automatically after a successful enquiry. It shows the saved customer contact details, account shortcuts, customer-UID-scoped event/rental history with All/Events/Hire filters, status explanations, last-update timestamps, request detail disclosure, saved catalogue price references and staff-recorded quote visibility. A submission query displays an immediate account confirmation.  WhatsApp links provide direct contact; they are not a persisted private messaging inbox. Follow-up actions return customers to the in-app enquiry form; there is no persistent private messaging inbox. Guest history remains tied to the same browser session. Customer records are sorted client-side so account queries do not require a customerId+createdAt composite index.
- src/app/admin/page.tsx: private operations workspace with a compact operations-first queue, live event/rental request records, staff-controlled status updates and quotes, equipment CRUD and a single-price service catalogue CRUD. Contact details are masked until staff explicitly reveals them. The public staff entry is a discreet link at the very bottom of the page, never a navigation item. When the services collection is empty, staff can explicitly load six editable base-price entries; deletion does not silently recreate them.
- src/app/admin/admin-gate.tsx: one-password staff access gate.
- src/app/api/operations-login/route.ts: verifies the password server-side, verifies an anonymous Firebase ID token, and grants a time-limited admin role document. It does not issue custom tokens.
- src/lib/firebase/client.ts: separate Firebase Auth/Firestore app instances for customer and staff sessions, so staff sign-in does not overwrite a customer's guest session.
- Firestore collections: customers, eventEnquiries, rentalRequests, admins, equipment, jobs, quotes, payments, businessSettings.
- Event/rental status values: new, reviewing, quoted, confirmed, in_progress, completed, declined. A submitted request is not a confirmed booking.

## Authentication and authorization
- Customers use Firebase Anonymous Auth when they submit an enquiry. Their guest session is persisted by Firebase in the same browser; account history is private to that UID.
- Staff use a separate Firebase app/Auth instance with Anonymous Auth. The staff-facing UI is one password field only.
- Server variables required for staff access: ADMIN_PASSWORD and FIREBASE_ADMIN_KEY (service-account JSON from the Lefifi Firebase project). The API verifies the ID token, checks the secret using a constant-time hash comparison, and writes an admin role with a 12-hour expiry. No Firebase custom token is created.
- The service account project_id must equal NEXT_PUBLIC_FIREBASE_PROJECT_ID. Never reuse credentials from another project.
- Admin documents are server-written only. Firestore rules require an unexpired role for staff reads/writes. Never create admin documents from client code or loosen rules to bypass login.
- Firebase Anonymous Auth must be enabled. Do not add Email/Password login, custom-token auth or deterministic staff identities.

## Data contracts
- customers/{uid}: uid, name, email, phone, createdAt, updatedAt (timestamps).
- eventEnquiries/{id}: customerId, customerName, optional email, phone, eventType, eventDate, location, brief, optional guestCount and priceReferences[], status, createdAt, updatedAt; staff may add quoteAmount, quoteDetails and quoteUpdatedAt.
- rentalRequests/{id}: customerId, customerName, optional email, phone, items[], eventDate, returnDate, deliveryLocation, deliveryRequired, optional servicingRequirement (yes/no/discuss), notes, optional priceReferences[], status, createdAt, updatedAt; staff may add quoteAmount, quoteDetails and quoteUpdatedAt.
- Customer writes are limited by firestore.rules; staff status changes are authorized by admins/{uid} role and expiry.
- Availability, quotes, payments, asset ownership, supplier sourcing, delivery/collection, servicing and maintenance must not be represented as confirmed until the team records verified information. Distinguish Lefifi-owned assets from supplier-sourced assets.

## Protected behavior
- PWA installation is inherited and locked. Preserve captured native beforeinstallprompt, user-triggered prompt, dismissible branded card, embedded-browser gate, iOS Safari Share → Add to Home Screen guidance, update lifecycle and service-worker registration. App-shell precaching runs concurrently so optional shell routes do not serialize service-worker install eligibility. Branding/assets and cache namespace may change; mechanics may not.
- Service worker cache is isolated under lefifi-shell-* and lefifi-media-*; legacy Iteration 13/The Plug caches are retired. Offline customer forms do not queue or claim to submit.
- The inherited guided assistant is adapted for Lefifi services; keep its teaser, chat history, keyboard/focus behavior, quick actions and scripted-not-live disclosure.
- UploadThing remains the only upload pipeline. firebase.json must not reference Firebase Storage rules; do not add Storage rules or Firebase Storage.
- Do not carry The Plug/Iteration 13 content, sample records, customer data, secrets, project IDs or deployment IDs into Lefifi.

## Environment
- Public Firebase web config: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID; optional NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID.
- Staff server config: ADMIN_PASSWORD, FIREBASE_ADMIN_KEY.
- Optional metadata base: NEXT_PUBLIC_BASE_URL.
- UploadThing requires its project token before upload controls are exposed. Do not substitute Firebase Storage.

## Verification
- npm ci
- npm run verify:identity
- npm run verify:offline
- npm run lint
- npm run build
- Test customer event enquiry and rental request, automatic post-submit account navigation, customer details and customer-only live account history/filters, status/quote reflection, staff correct/incorrect access word, 12-hour expiry, denied cross-customer reads, offline unsent form state, PWA native prompt and iOS/embedded-browser behavior.
- No local build, emulator, browser, physical-device or production deployment is claimed unless its output is actually inspected.

## Current checkpoint
- Foundation baseline: 8cab59b.
- Customer discovery, event/rental enquiry flows, customer request account, staff operations, quote recording, equipment register, Firestore contracts, live service catalogue and single-price CRUD are committed to main.
- The service catalogue offers six editable single-price starter entries through an explicit staff action when the services collection is empty. Starter values are indicative baselines, not verified final quotes; staff can edit or remove them. Starter values are indicative baselines, not verified final quotes; staff can edit or remove them.
- The official supplied brand logo is `public/lefifi.jpg` and is used in the public site, staff workspace and PWA identity. `public/lefifi-mark.svg` remains the separate manifest-compatible vector mark.
- Latest source checkpoint: price-reference and direct-account handoff changes are committed to `main` (see latest GitHub commit). The operations workspace is now queue-first with masked contact details and a discreet footer staff entry; customer follow-up stays in the app. The PWA app-shell cache uses concurrent precaching and closes the early-prompt listener race.
- Vercel reported a build-rate-limit failure on the current change set; no live deployment is verified. Firestore rules deployment also failed because the GitHub Actions secret `FIREBASE_SERVICE_ACCOUNT_JSON` was empty; no rules deployment is claimed.
- Browser/device visual QA and production deployment are not claimed. End-to-end Firebase QA still depends on the correct Lefifi Firebase web config, same-project Firebase Admin service account, operations access word and published Firestore rules.
- Product-owner QA remains required for customer submissions, private account history, staff access/expiry, quote visibility, equipment and service CRUD, PWA install behavior, real mobile layouts and the official logo asset.


## Interaction clarity and feedback standard
- Every actionable element must look actionable before hover: use a distinct surface/border or filled control, clear action wording, a recognizable icon paired with text where useful, and a visible directional cue for navigation. Never style an action like static body copy.
- Use semantic links for navigation and buttons for actions. Make the full intended tile/card hit area interactive; do not rely on a tiny arrow or hover-only cue.
- Provide visible hover, pressed, keyboard-focus and disabled states. Respect prefers-reduced-motion. Ensure touch targets are comfortably tappable (target at least 44–48 CSS px where practical) with spacing between neighboring actions.
- Maintain readable foreground/background contrast: WCAG AA minimum 4.5:1 for normal text and 3:1 for large text and meaningful UI graphics. Never communicate state through colour alone; pair it with labels, icons, borders or shape.
- Feedback must be contextual and persistent enough to be noticed. Prefer inline field errors, form-level error summaries, persistent success/confirmation states, updated records, progress indicators and notification panels. Do not use disappearing toasts as the only confirmation, error or important status channel. A toast may only be considered for non-critical, supplementary status where missing it has no consequence and an accessible persistent alternative exists.
- Before acceptance, inspect each major customer and staff journey at mobile and desktop widths. Ask: can a first-time user identify what is tappable, what happens next, whether an action succeeded, and how to recover from an error without guessing?
- Research basis: Nielsen Norman Group guidance on click uncertainty and signifiers; Google Material Design accessibility guidance on clear hierarchy, redundant cues, contrast and touch targets; GitHub Primer accessibility guidance discouraging toasts and recommending persistent/contextual feedback; Scottish Government Design System guidance on the risk of disappearing toasts.

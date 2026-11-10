# Lefifi Investments — Project Operating Contract

## Product
- Repository: gatshaayanda/lefifi-investments
- Branch: main
- Foundation: Iteration 13 baseline 8cab59b; selected explicitly by the product owner.
- Business: Lefifi Investments, Gaborone, Botswana. Event planning/management, furniture and styling, indoor/outdoor LED screens, sound, lighting, stage design/production, and mobile toilet/equipment hire.
- Public contact: +267 73 706 331; P.O. Box 201958, Bontleng.
- Firebase project: learn-fx-trading-bw-academy.
- Uploads: UploadThing only. Firebase Storage is not configured or deployed.

## Architecture and journeys
- src/app/page.tsx: public services, event enquiry and equipment hire request forms. Requests are written to Firestore.
- src/app/account/page.tsx: reads only the signed-in guest/customer's own event and rental records.
- src/app/admin/page.tsx: private operations workspace with live event/rental request queues and staff-controlled status updates.
- src/app/admin/admin-gate.tsx: one-word staff access gate.
- src/app/api/operations-login/route.ts: verifies the access word server-side, verifies an anonymous Firebase ID token, and grants a time-limited admin role document. It does not issue custom tokens.
- src/lib/firebase/client.ts: separate Firebase Auth/Firestore app instances for customer and staff sessions, so staff sign-in does not overwrite a customer's guest session.
- Firestore collections: customers, eventEnquiries, rentalRequests, admins, equipment, jobs, quotes, payments, businessSettings.
- Event/rental status values: new, reviewing, quoted, confirmed, in_progress, completed, declined. A submitted request is not a confirmed booking.

## Authentication and authorization
- Customers use Firebase Anonymous Auth when they submit an enquiry. Their guest session is persisted by Firebase in the same browser; account history is private to that UID.
- Staff use a separate Firebase app/Auth instance with Anonymous Auth. The staff-facing UI is one access-word field only.
- Server variables required for staff access: LEFIFI_OPERATIONS_WORD and FIREBASE_ADMIN_KEY (service-account JSON from the Lefifi Firebase project). The API verifies the ID token, checks the secret using a constant-time hash comparison, and writes an admin role with a 12-hour expiry. No Firebase custom token is created.
- The service account project_id must equal NEXT_PUBLIC_FIREBASE_PROJECT_ID. Never reuse credentials from another project.
- Admin documents are server-written only. Firestore rules require an unexpired role for staff reads/writes. Never create admin documents from client code or loosen rules to bypass login.
- Firebase Anonymous Auth must be enabled. Do not add Email/Password login, custom-token auth or deterministic staff identities.

## Data contracts
- customers/{uid}: uid, name, email, phone, createdAt, updatedAt (timestamps).
- eventEnquiries/{id}: customerId, customerName, optional email, phone, eventType, eventDate, location, brief, optional guestCount, status, createdAt, updatedAt; staff may add quoteAmount, quoteDetails and quoteUpdatedAt.
- rentalRequests/{id}: customerId, customerName, optional email, phone, items[], eventDate, returnDate, deliveryLocation, deliveryRequired, notes, status, createdAt, updatedAt; staff may add quoteAmount, quoteDetails and quoteUpdatedAt.
- Customer writes are limited by firestore.rules; staff status changes are authorized by admins/{uid} role and expiry.
- Availability, quotes, payments, asset ownership, supplier sourcing, delivery/collection, servicing and maintenance must not be represented as confirmed until the team records verified information. Distinguish Lefifi-owned assets from supplier-sourced assets.

## Protected behavior
- PWA installation is inherited and locked. Preserve captured native beforeinstallprompt, user-triggered prompt, dismissible branded card, embedded-browser gate, iOS Safari Share → Add to Home Screen guidance, update lifecycle and service-worker registration. Branding/assets and cache namespace may change; mechanics may not.
- Service worker cache is isolated under lefifi-shell-* and lefifi-media-*; legacy Iteration 13/The Plug caches are retired. Offline customer forms do not queue or claim to submit.
- The inherited guided assistant is adapted for Lefifi services; keep its teaser, chat history, keyboard/focus behavior, quick actions and scripted-not-live disclosure.
- UploadThing remains the only upload pipeline. firebase.json must not reference Firebase Storage rules; do not add Storage rules or Firebase Storage.
- Do not carry The Plug/Iteration 13 content, sample records, customer data, secrets, project IDs or deployment IDs into Lefifi.

## Environment
- Public Firebase web config: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID; optional NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID.
- Staff server config: LEFIFI_OPERATIONS_WORD, FIREBASE_ADMIN_KEY.
- Optional metadata base: NEXT_PUBLIC_BASE_URL.
- UploadThing requires its project token before upload controls are exposed. Do not substitute Firebase Storage.

## Verification
- npm ci
- npm run verify:identity
- npm run verify:offline
- npm run lint
- npm run build
- Test customer event enquiry and rental request, customer-only account history, staff correct/incorrect access word, 12-hour expiry, status update reflected in customer account, denied cross-customer reads, offline unsent form state, PWA native prompt and iOS/embedded-browser behavior.
- No local build, emulator, browser, physical-device or production deployment is claimed unless its output is actually inspected.

## Current checkpoint
- Baseline: 8cab59b.
- Implementation is being developed directly on main and pushed as changes are made. See latest GitHub commit and CI status for verification.
- Product-owner QA remains required for live Firebase credentials, staff access, customer/admin end-to-end behavior, official logo assets and physical-device PWA behavior.

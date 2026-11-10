# Lefifi Investments — Events, Rentals & Production

A customer-facing service experience and private operations workspace for Lefifi Investments in Gaborone, Botswana.

## Customer journey
1. Browse event planning, furniture/styling, LED screens, sound, lighting, stage production and mobile toilet/equipment hire.
2. Choose Event enquiry or Equipment hire and submit the relevant brief.
3. The app creates a Firebase guest session, stores the customer profile and saves the request in Firestore.
4. Customers can return to My requests in the same browser session to review the latest status.
5. A submitted request is not a confirmed booking. Lefifi must review scope, availability, pricing and delivery arrangements before confirming.

## Staff operations
- Open /admin directly; it is not exposed in public navigation.
- Enter the one-word Lefifi Operations access word.
- Review incoming event enquiries and equipment hire requests in the live Firestore queue.
- Filter by status, record a Pula quote with scope/inclusions, then move a request through review, quote, confirmation, work and completion. Customers see the recorded quote in My requests; it is not a payment receipt or booking confirmation.
- Customer-facing account status updates are driven by the same Firestore record.
- Staff sessions expire after 12 hours and are isolated from the customer guest session.

## Firebase setup
Firebase project: learn-fx-trading-bw-academy.

Enable Authentication → Sign-in method → Anonymous. Customer and staff experiences both use anonymous Firebase Auth; staff access is granted only after the server validates the access word and verifies the ID token.

Set these environment variables in the deployment environment:

| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase web API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase auth domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Must be learn-fx-trading-bw-academy |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase messaging sender ID |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase web app ID |
| NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID | Optional Analytics ID |
| LEFIFI_OPERATIONS_WORD | Server-only one-word staff secret |
| FIREBASE_ADMIN_KEY | Server-only service-account JSON from this same Firebase project |
| NEXT_PUBLIC_BASE_URL | Canonical public site URL |

The operations API does not create a Firebase custom token. It verifies the staff session's Firebase ID token, validates LEFIFI_OPERATIONS_WORD, then creates/refreshes admins/{uid} with a 12-hour expiry. The service account project_id must match NEXT_PUBLIC_FIREBASE_PROJECT_ID. Never paste service-account JSON into client code or commit it.

Publish firestore.rules and firestore.indexes.json to the Lefifi Firebase project. The GitHub rules workflow uses the FIREBASE_SERVICE_ACCOUNT_JSON repository secret and deploys only Firestore rules/indexes to the project ID above. No Firebase Storage rules are configured or deployed.

## Uploads
UploadThing is the approved media pipeline. The inherited UploadThing route is retained. Do not configure Firebase Storage or Storage rules. Upload controls should only be enabled once the Lefifi UploadThing token is configured.

## PWA and offline boundaries
The existing PWA installation behavior is protected: native prompt capture and user gesture, dismissible install card, embedded-browser handling, iOS Safari guidance, service-worker updates and offline shell remain intact. Branding and cache identity have been adapted to Lefifi.

The public shell and approved media may be cached. New event/rental requests are not queued offline; the form reports that the request was not sent and must be submitted again after reconnecting. Account history can show data already cached on the device, but current status requires connectivity.

## Verification commands
- npm ci
- npm run verify:identity
- npm run verify:offline
- npm run lint
- npm run build

## Known QA/configuration items
- Confirm Firebase web config and same-project service-account JSON are set in the deployment environment.
- Configure the server-only LEFIFI_OPERATIONS_WORD.
- Upload the official lefifi.jpg logo and replace the interim monogram/PWA mark with approved brand assets.
- Confirm the mobile toilet hire workflow: delivery, collection, servicing/cleaning and maintenance responsibilities.
- Confirm inventory quantities, asset ownership vs supplier-sourced items, and quote/deposit rules before enabling inventory availability or payment recording.
- Test customer and staff flows on real mobile devices; a GitHub push is not a deployment or device QA.

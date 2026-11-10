import fs from "node:fs";

const read = path => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const sw = read("../public/sw.js");
const page = read("../src/app/page.tsx");
const account = read("../src/app/account/page.tsx");
const admin = read("../src/app/admin/page.tsx");
const offlinePage = read("../src/app/offline/page.tsx");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(/const CACHE_VERSION = "lefifi-shell-v\d+"/.test(sw), "versioned Lefifi app-shell cache is missing");
check(/const MEDIA_CACHE = "lefifi-media-v\d+"/.test(sw), "versioned Lefifi media cache is missing");
check(sw.includes('"/", "/offline"'), "home and offline fallback must be precached");
check(sw.includes('event.respondWith(cacheMediaRequest(request, event))'), "approved media requests must retain the offline media cache handler");
check(sw.includes('event.data?.type === "CACHE_MEDIA"'), "service worker must accept approved media cache requests");
check(sw.includes('"images.unsplash.com"') && sw.includes('"utfs.io"') && sw.includes('"ufs.sh"'), "media cache must remain restricted to approved image/upload hosts");
check(sw.includes("const MEDIA_LIMIT = 40"), "media cache must remain bounded");
check(page.includes('addDoc(collection(db, "eventEnquiries")') && page.includes('addDoc(collection(db, "rentalRequests")'), "customer forms must create real Firestore enquiries and rental requests");
check(page.includes("serverTimestamp()") && page.includes("signInAnonymously(auth)"), "customer request creation must use authenticated sessions and server timestamps");
check(page.includes("This form will not send or queue a request"), "offline customer submissions must be clearly identified as unsent");
check(/where\(\s*"customerId"\s*,\s*"=="\s*,\s*next\.uid\s*\)/.test(account) && account.includes('collection(db, "eventEnquiries")') && account.includes('collection(db, "rentalRequests")'), "customer account must query only the signed-in customer's records");
check(admin.includes("onSnapshot") && admin.includes("updateDoc") && admin.includes("staffDb"), "staff workspace must subscribe to and update Firestore records");
check(offlinePage.includes("will not send or queue a request"), "offline guide must explain that new requests are not queued");
check(sw.includes('key.startsWith("iteration13-shell-")') && sw.includes('key.startsWith("theplug-shell-")'), "service worker must retire inherited app-shell caches");

if (failures.length) {
  console.error("OFFLINE VERIFICATION FAILED");
  failures.forEach(failure => console.error(" - " + failure));
  process.exit(1);
}
console.log("OFFLINE VERIFIED — Lefifi cache isolation, bounded media cache, customer Firestore requests, private account queries and staff workflow.");

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "build-placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "build-placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "build-placeholder",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "build-placeholder",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "build-placeholder",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
export const hasFirebaseWebConfig=Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
);
const app=getApps().some(item=>item.name==="[DEFAULT]")?getApp():initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});

// Staff authentication is isolated from the customer's guest session in the same browser.
const staffApp=getApps().find(item=>item.name==="LefifiStaff")??initializeApp(firebaseConfig,"LefifiStaff");
export const staffAuth=getAuth(staffApp);
export const staffDb=getFirestore(staffApp);
export {app};

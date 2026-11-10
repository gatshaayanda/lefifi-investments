import { createHash, timingSafeEqual } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function matchesWord(input:string,expected:string) {
  if (!input || !expected) return false;
  return timingSafeEqual(createHash("sha256").update(input).digest(),createHash("sha256").update(expected).digest());
}
function adminApp() {
  const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const raw=process.env.FIREBASE_ADMIN_KEY;
  if(!projectId||!raw) throw new Error("Lefifi server authentication is not configured.");
  let account:Record<string,unknown>;
  try { account=JSON.parse(raw) as Record<string,unknown>; }
  catch { throw new Error("FIREBASE_ADMIN_KEY must contain valid service-account JSON."); }
  if(account.project_id!==projectId) throw new Error("The Firebase Admin service account does not match the Lefifi Firebase project.");
  account.private_key=typeof account.private_key==="string"?account.private_key.replace(/\\n/g,"\n"):account.private_key;
  const existing=getApps().find(app=>app.options.projectId===projectId);
  return existing??initializeApp({credential:cert(account as Parameters<typeof cert>[0]),projectId},"lefifi-operations");
}
export async function POST(request:Request) {
  try {
    const expected=process.env.LEFIFI_OPERATIONS_WORD;
    if(!expected) return NextResponse.json({error:"Staff access is not configured. Add LEFIFI_OPERATIONS_WORD to the server environment."},{status:503});
    const authorization=request.headers.get("authorization")||"";
    const idToken=authorization.startsWith("Bearer ")?authorization.slice(7):"";
    if(!idToken) return NextResponse.json({error:"Your staff session could not be verified. Refresh and try again."},{status:401});
    const body=await request.json().catch(()=>null) as {word?:unknown}|null;
    const word=typeof body?.word==="string"?body.word.trim():"";
    if(!matchesWord(word,expected)) return NextResponse.json({error:"Access denied. Check the access word."},{status:401});
    const app=adminApp();
    const decoded=await getAuth(app).verifyIdToken(idToken);
    if(decoded.firebase?.sign_in_provider!=="anonymous") return NextResponse.json({error:"Staff access requires a separate guest staff session."},{status:403});
    const expiry=Timestamp.fromMillis(Date.now()+12*60*60*1000);
    await getFirestore(app).collection("admins").doc(decoded.uid).set({
      role:"owner",expiresAt:expiry,createdAt:FieldValue.serverTimestamp(),lastAccessAt:FieldValue.serverTimestamp()
    },{merge:true});
    return NextResponse.json({ok:true,expiresAt:expiry.toDate().toISOString()},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Lefifi operations access failed:",error instanceof Error?error.message:"unknown error");
    return NextResponse.json({error:"Staff access could not be verified. Check the Lefifi server configuration."},{status:500});
  }
}

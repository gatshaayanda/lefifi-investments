"use client";
import { onAuthStateChanged, signInAnonymously, signOut, type User } from "firebase/auth";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { staffAuth, staffDb, hasFirebaseWebConfig } from "@/lib/firebase/client";

export default function AdminGate({children}:{children:React.ReactNode}) {
  const [user,setUser]=useState<User|null>(null);
  const [checking,setChecking]=useState(true);
  const [authorized,setAuthorized]=useState(false);
  const [word,setWord]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let stopRole=()=>{};
    let expiryTimer:number|undefined;
    const stopAuth=onAuthStateChanged(staffAuth,next=>{
      stopRole();stopRole=()=>{};if(expiryTimer)window.clearTimeout(expiryTimer);setUser(next);setAuthorized(false);
      if(!next){setChecking(false);return;}
      setChecking(true);
      stopRole=onSnapshot(doc(staffDb,"admins",next.uid),snap=>{
        const data=snap.data();
        const expiry=data?.expiresAt instanceof Timestamp ? data.expiresAt.toMillis() : 0;
        const allowed=snap.exists()&&["owner","staff"].includes(String(data?.role||""))&&expiry>Date.now();
        setAuthorized(allowed);setChecking(false);
        if(allowed&&expiry>Date.now())expiryTimer=window.setTimeout(()=>void signOut(staffAuth),expiry-Date.now());
        if(snap.exists()&&!allowed)void signOut(staffAuth);
      },()=>{setError("We could not verify staff access. Check the connection and try again.");setChecking(false);});
    });
    return ()=>{stopRole();stopAuth();if(expiryTimer)window.clearTimeout(expiryTimer);};
  },[]);
  async function enter(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    if(!hasFirebaseWebConfig){setError("Lefifi Firebase web configuration is missing.");return;}
    setBusy(true);setError("");
    try {
      const active=user ?? (await signInAnonymously(staffAuth)).user;
      const idToken=await active.getIdToken(true);
      const response=await fetch("/api/operations-login",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+idToken},body:JSON.stringify({word})});
      const payload=await response.json() as {error?:string};
      if(!response.ok)throw new Error(payload.error||"Access denied. Check the access word.");
      setWord("");
    } catch(cause) { setError(cause instanceof Error?cause.message:"We could not verify access. Try again."); }
    finally { setBusy(false); }
  }
  if(checking)return <main className="lf-admin"><div className="lf-admin-shell"><p className="lf-eyebrow">LEFIFI OPERATIONS</p><h1>Checking staff access…</h1></div></main>;
  if(user&&authorized)return <>{children}</>;
  return <main className="lf-admin"><div className="lf-admin-shell"><Link href="/" className="lf-admin-back">← Customer website</Link><p className="lf-eyebrow">PRIVATE STAFF WORKSPACE</p><h1>Operations<br/><em>sign in.</em></h1><p className="lf-admin-intro">Enter the Lefifi operations access word to open the staff workspace.</p><form className="lf-admin-login" onSubmit={enter}><label htmlFor="operations-word">Access word</label><input id="operations-word" type="password" value={word} onChange={event=>setWord(event.target.value)} autoComplete="current-password" required autoFocus/><button type="submit" disabled={busy||!hasFirebaseWebConfig}>{busy?"Verifying access…":"Enter operations ↗"}</button>{error&&<p className="lf-error" role="alert">{error}</p>}</form>{!hasFirebaseWebConfig&&<p className="lf-error">Firebase web configuration is not available in this deployment.</p>}<p className="lf-admin-footnote">Staff access is checked by the server. The customer website does not expose this workspace in its main navigation.</p></div></main>;
}

import Link from "next/link";

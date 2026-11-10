"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";

type RecordItem = { id: string; customerId: string; customerName: string; status: string; createdAt?: { toDate?: () => Date }; eventType?: string; eventDate?: string; location?: string; items?: string[]; deliveryLocation?: string; servicingRequirement?:string; notes?: string; quoteAmount?:number; quoteDetails?:string };
function dateLabel(value: RecordItem["createdAt"]) { try { return value?.toDate ? value.toDate().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "Recently submitted"; } catch { return "Recently submitted"; } }

export default function AccountPage() {
  const [user,setUser]=useState<User|null>(null);
  const [events,setEvents]=useState<RecordItem[]>([]);
  const [rentals,setRentals]=useState<RecordItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let stopEvents=()=>{},stopRentals=()=>{};
    const stopAuth=onAuthStateChanged(auth,next=>{
      stopEvents();stopRentals();setUser(next);setEvents([]);setRentals([]);
      if(!next){setLoading(false);return;}
      setLoading(true);
      stopEvents=onSnapshot(query(collection(db,"eventEnquiries"),where("customerId","==",next.uid),orderBy("createdAt","desc")),snap=>{setEvents(snap.docs.map(d=>({id:d.id,...d.data()} as RecordItem)));setLoading(false);},err=>{setError(err.message);setLoading(false);});
      stopRentals=onSnapshot(query(collection(db,"rentalRequests"),where("customerId","==",next.uid),orderBy("createdAt","desc")),snap=>{setRentals(snap.docs.map(d=>({id:d.id,...d.data()} as RecordItem)));setLoading(false);},err=>{setError(err.message);setLoading(false);});
    });
    return ()=>{stopAuth();stopEvents();stopRentals();};
  },[]);
  const all=[...events.map(item=>({...item,kind:"Event enquiry"})),...rentals.map(item=>({...item,kind:"Equipment request"}))].sort((a,b)=>(b.createdAt?.toDate?.().getTime()??0)-(a.createdAt?.toDate?.().getTime()??0));
  return <main className="lefifi lf-inner"><header className="lf-header"><div className="lf-container lf-nav"><Link className="lf-brand" href="/"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>INVESTMENTS</small></span></Link><Link className="lf-nav-account" href="/">Back to Lefifi ↗</Link></div></header>
    <section className="lf-account-wrap"><div className="lf-container"><p className="lf-eyebrow">CUSTOMER WORKSPACE</p><h1 className="lf-inner-title">Your requests.</h1><p className="lf-account-lead">See what you have sent to the Lefifi team and the latest recorded status.</p>
      {!hasFirebaseWebConfig ? <div className="lf-state lf-error">Customer records are not connected on this deployment yet. Please contact Lefifi directly.</div> : loading ? <div className="lf-state">Connecting to your saved requests…</div> : !user ? <div className="lf-state"><h2>No active request session</h2><p>Open the same browser you used to submit your enquiry. Guest request history is tied to that browser session.</p><Link className="lf-primary" href="/#request">Start an enquiry <span>↗</span></Link></div> : error ? <div className="lf-state lf-error">We could not load your requests. {error}</div> : all.length ? <div className="lf-record-list">{all.map(item=><article className="lf-record" key={item.id}><div className="lf-record-top"><span>{item.kind}</span><b>{item.status.replaceAll("_"," ")}</b></div><h2>{item.kind==="Event enquiry" ? item.eventType || "Event enquiry" : (item.items||[]).join(", ")}</h2><p>{item.kind==="Event enquiry" ? [item.eventDate,item.location].filter(Boolean).join(" · ") : [item.eventDate,item.deliveryLocation,item.servicingRequirement==="yes"?"Servicing requested":item.servicingRequirement==="no"?"No servicing":item.servicingRequirement==="discuss"?"Servicing to discuss":""].filter(Boolean).join(" · ")}</p><small>Reference {item.id.slice(0,8).toUpperCase()} · Sent {dateLabel(item.createdAt)}</small><p className="lf-record-note">The team will update this status when the request has been reviewed. A request is not a confirmed booking until Lefifi confirms it with you.</p>{item.quoteAmount!==undefined&&<div className="lf-customer-quote"><span>QUOTE RECORDED BY LEFIFI</span><strong>P{item.quoteAmount.toLocaleString("en-BW",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>{item.quoteDetails&&<p>{item.quoteDetails}</p>}<small>Contact the team to discuss or confirm the quoted scope. This is not a payment receipt.</small></div>}</article>)}</div> : <div className="lf-state"><h2>No requests yet</h2><p>Your submitted event enquiries and equipment requests will appear here.</p><Link className="lf-primary" href="/#request">Send your first request <span>↗</span></Link></div>}
    </div></section>
    <footer className="lf-footer"><div className="lf-container lf-footer-bottom"><span>© {new Date().getFullYear()} Lefifi Investments</span><a href="tel:+26773706331">+267 73 706 331</a></div></footer>
  </main>;
}

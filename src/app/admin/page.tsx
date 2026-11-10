"use client";

import AdminGate from "@/app/admin/admin-gate";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { staffAuth, staffDb } from "@/lib/firebase/client";

type OpsRecord = { id:string; customerName:string; email?:string; phone:string; status:string; createdAt?:{toDate?:()=>Date}; updatedAt?:unknown; eventType?:string; eventDate?:string; guestCount?:number; location?:string; brief?:string; items?:string[]; returnDate?:string; deliveryLocation?:string; deliveryRequired?:boolean; notes?:string };
const statuses=["new","reviewing","quoted","confirmed","in_progress","completed","declined"];
const time=(value:OpsRecord["createdAt"])=>value?.toDate?value.toDate().toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Just received";

function Workspace(){
 const [events,setEvents]=useState<OpsRecord[]>([]);
 const [rentals,setRentals]=useState<OpsRecord[]>([]);
 const [filter,setFilter]=useState("all");
 const [error,setError]=useState("");
 const [saving,setSaving]=useState("");
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const stopA=onSnapshot(query(collection(staffDb,"eventEnquiries"),orderBy("createdAt","desc")),snap=>{setEvents(snap.docs.map(d=>({id:d.id,...d.data()} as OpsRecord)));setLoading(false);},err=>{setError(err.message);setLoading(false);});
  const stopB=onSnapshot(query(collection(db,"rentalRequests"),orderBy("createdAt","desc")),snap=>{setRentals(snap.docs.map(d=>({id:d.id,...d.data()} as OpsRecord)));setLoading(false);},err=>{setError(err.message);setLoading(false);});
  return ()=>{stopA();stopB();};
 },[]);
 const records=useMemo(()=>[...events.map(r=>({...r,kind:"Event enquiry",collection:"eventEnquiries"})),...rentals.map(r=>({...r,kind:"Equipment hire",collection:"rentalRequests"}))].sort((a,b)=>(b.createdAt?.toDate?.().getTime()??0)-(a.createdAt?.toDate?.().getTime()??0)),[events,rentals]);
 const filtered=records.filter(r=>filter==="all"||r.status===filter);
 const needsAction=records.filter(r=>["new","reviewing","quoted"].includes(r.status)).length;
 async function changeStatus(collectionName:string,id:string,status:string){
  const key=collectionName+":"+id;setSaving(key);setNotice("");setError("");
  try{await updateDoc(doc(staffDb,collectionName,id),{status,updatedAt:serverTimestamp()});setNotice("Request status saved. The customer will see the updated status in their account.");}
  catch(cause){setError(cause instanceof Error?cause.message:"Could not update this request.");}
  finally{setSaving("");}
 }
 return <main className="lf-admin lf-workspace"><header className="lf-admin-top"><Link className="lf-brand" href="/"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>OPERATIONS</small></span></Link><div><span>Staff workspace · live Firestore records</span><button onClick={()=>void signOut(staffAuth)}>Sign out</button></div></header>
 <div className="lf-admin-content"><div className="lf-admin-title"><div><p className="lf-eyebrow">OPERATIONS OVERVIEW</p><h1>The work,<br/><em>in motion.</em></h1><p>Review new enquiries, check rental requirements and keep customer-facing statuses accurate.</p></div><a href="tel:+26773706331">Lefifi contact · +267 73 706 331</a></div>
 <div className="lf-metrics"><article><span>All requests</span><strong>{records.length}</strong><small>Saved in Firestore</small></article><article><span>Needs attention</span><strong>{needsAction}</strong><small>New, reviewing or quoted</small></article><article><span>Event enquiries</span><strong>{events.length}</strong><small>Planning and production</small></article><article><span>Equipment hire</span><strong>{rentals.length}</strong><small>Rental requests</small></article></div>
 <div className="lf-ops-toolbar"><div><h2>Incoming work</h2><p>Live records update when a customer submits or staff changes a status.</p></div><label>Filter <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label></div>
 {loading?<div className="lf-state">Connecting to Lefifi request records…</div>:error?<div className="lf-state lf-error">Live records could not be loaded: {error}</div>:filtered.length===0?<div className="lf-state"><h2>{records.length?"No requests in this view":"No customer requests yet"}</h2><p>{records.length?"Change the status filter to see other work.":"New event enquiries and equipment hire requests will appear here as soon as customers submit them."}</p></div>:<div className="lf-ops-list">{filtered.map(record=><article className="lf-ops-record" key={record.collection+record.id}><div className="lf-ops-record-head"><div><span className="lf-record-kind">{record.kind}</span><h3>{record.kind==="Event enquiry"?(record.eventType||"Event enquiry"):(record.items||[]).join(", ")}</h3></div><span className={"lf-status lf-status-"+record.status}>{record.status.replaceAll("_"," ")}</span></div><div className="lf-ops-facts"><span><small>Customer</small><strong>{record.customerName}</strong></span><span><small>Phone</small><a href={"tel:"+record.phone}>{record.phone}</a></span><span><small>Submitted</small><strong>{time(record.createdAt)}</strong></span>{record.email&&<span><small>Email</small><a href={"mailto:"+record.email}>{record.email}</a></span>}{record.eventDate&&<span><small>Event / hire date</small><strong>{record.eventDate}{record.returnDate?" → "+record.returnDate:""}</strong></span>}{record.guestCount&&<span><small>Guests</small><strong>{record.guestCount}</strong></span>}{(record.location||record.deliveryLocation)&&<span><small>Location</small><strong>{record.location||record.deliveryLocation}</strong></span>}{record.deliveryRequired!==undefined&&<span><small>Delivery</small><strong>{record.deliveryRequired?"Requested":"Not requested"}</strong></span>}</div>
 {record.brief&&<p className="lf-ops-brief">{record.brief}</p>}{record.notes&&<p className="lf-ops-brief">{record.notes}</p>}
 <div className="lf-ops-actions"><span>Reference {record.id.slice(0,8).toUpperCase()}</span><label>Update status<select value={record.status} disabled={saving===record.collection+":"+record.id} onChange={e=>void changeStatus(record.collection,record.id,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label></div></article>)}</div>}
 {notice&&<p className="lf-success-inline" role="status">{notice}</p>}{error&&<p className="lf-error" role="alert">{error}</p>}
 <p className="lf-admin-disclaimer">This workspace records customer requests and staff status updates. It does not confirm availability, create quotes, verify payments or dispatch equipment automatically.</p>
 </div></main>;
}
export default function AdminPage(){return <AdminGate><Workspace/></AdminGate>}

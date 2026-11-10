"use client";

import AdminGate from "@/app/admin/admin-gate";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { staffAuth, staffDb } from "@/lib/firebase/client";

type EquipmentRecord = { id:string; name:string; category:string; source:"owned"|"supplier"; quantity:number; status:string; supplier?:string; notes?:string; quoteAmount?:number; quoteDetails?:string };
type OpsRecord = { id:string; customerName:string; email?:string; phone:string; status:string; createdAt?:{toDate?:()=>Date}; updatedAt?:unknown; eventType?:string; eventDate?:string; guestCount?:number; location?:string; brief?:string; items?:string[]; returnDate?:string; deliveryLocation?:string; deliveryRequired?:boolean; notes?:string; quoteAmount?:number; quoteDetails?:string };
const statuses=["new","reviewing","quoted","confirmed","in_progress","completed","declined"];
const time=(value:OpsRecord["createdAt"])=>value?.toDate?value.toDate().toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Just received";

function Workspace(){
 const [events,setEvents]=useState<OpsRecord[]>([]);
 const [rentals,setRentals]=useState<OpsRecord[]>([]);
 const [equipment,setEquipment]=useState<EquipmentRecord[]>([]);
 const [assetName,setAssetName]=useState("");
 const [assetCategory,setAssetCategory]=useState("");
 const [assetSource,setAssetSource]=useState<"owned"|"supplier">("owned");
 const [assetQuantity,setAssetQuantity]=useState("1");
 const [assetStatus,setAssetStatus]=useState("available");
 const [assetSupplier,setAssetSupplier]=useState("");
 const [assetNotes,setAssetNotes]=useState("");
 const [editingAsset,setEditingAsset]=useState("");
 const [quoteAmounts,setQuoteAmounts]=useState<Record<string,string>>({});
 const [quoteDetails,setQuoteDetails]=useState<Record<string,string>>({});
 const [filter,setFilter]=useState("all");
 const [error,setError]=useState("");
 const [saving,setSaving]=useState("");
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const stopA=onSnapshot(query(collection(staffDb,"eventEnquiries"),orderBy("createdAt","desc")),snap=>{setEvents(snap.docs.map(d=>({id:d.id,...d.data()} as OpsRecord)));setLoading(false);},err=>{setError(err.message);setLoading(false);});
  const stopB=onSnapshot(query(collection(staffDb,"rentalRequests"),orderBy("createdAt","desc")),snap=>{setRentals(snap.docs.map(d=>({id:d.id,...d.data()} as OpsRecord)));setLoading(false);},err=>{setError(err.message);setLoading(false);});
  const stopC=onSnapshot(collection(staffDb,"equipment"),snap=>setEquipment(snap.docs.map(d=>({id:d.id,...d.data()} as EquipmentRecord))),err=>setError(err.message));
  return ()=>{stopA();stopB();stopC();};
 },[]);
 const records=useMemo(()=>[...events.map(r=>({...r,kind:"Event enquiry",collection:"eventEnquiries"})),...rentals.map(r=>({...r,kind:"Equipment hire",collection:"rentalRequests"}))].sort((a,b)=>(b.createdAt?.toDate?.().getTime()??0)-(a.createdAt?.toDate?.().getTime()??0)),[events,rentals]);
 const filtered=records.filter(r=>filter==="all"||r.status===filter);
 const needsAction=records.filter(r=>["new","reviewing","quoted"].includes(r.status)).length;
 function editAsset(item:EquipmentRecord){setEditingAsset(item.id);setAssetName(item.name);setAssetCategory(item.category);setAssetSource(item.source);setAssetQuantity(String(item.quantity));setAssetStatus(item.status);setAssetSupplier(item.supplier||"");setAssetNotes(item.notes||"");}
 async function saveAsset(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const payload={name:assetName.trim(),category:assetCategory.trim(),source:assetSource,quantity:Math.max(1,Number(assetQuantity)||1),status:assetStatus,supplier:assetSupplier.trim(),notes:assetNotes.trim(),updatedAt:serverTimestamp()};if(!payload.name||!payload.category)return;setSaving("equipment");setError("");setNotice("");try{if(editingAsset)await updateDoc(doc(staffDb,"equipment",editingAsset),payload);else await addDoc(collection(staffDb,"equipment"),{...payload,createdAt:serverTimestamp()});setAssetName("");setAssetCategory("");setAssetSource("owned");setAssetQuantity("1");setAssetStatus("available");setAssetSupplier("");setAssetNotes("");setEditingAsset("");setNotice("Equipment record saved.");}catch(cause){setError(cause instanceof Error?cause.message:"Could not save the equipment record.");}finally{setSaving("");}}
 async function removeAsset(id:string){if(!window.confirm("Delete this equipment record? This does not change any customer request."))return;try{await deleteDoc(doc(staffDb,"equipment",id));setNotice("Equipment record deleted.");}catch(cause){setError(cause instanceof Error?cause.message:"Could not delete this equipment record.");}}
 async function saveQuote(collectionName:string,id:string){const amount=Number(quoteAmounts[id]);if(!Number.isFinite(amount)||amount<=0){setError("Enter a quote amount greater than zero.");return;}setSaving("quote:"+id);setError("");setNotice("");try{await updateDoc(doc(staffDb,collectionName,id),{quoteAmount:amount,quoteDetails:(quoteDetails[id]||"").trim(),quoteUpdatedAt:serverTimestamp(),status:"quoted",updatedAt:serverTimestamp()});setNotice("Quote saved to the customer request. It is not a booking confirmation or payment receipt.");}catch(cause){setError(cause instanceof Error?cause.message:"Could not save this quote.");}finally{setSaving("");}}
 async function changeStatus(collectionName:string,id:string,status:string){
  const key=collectionName+":"+id;setSaving(key);setNotice("");setError("");
  try{await updateDoc(doc(staffDb,collectionName,id),{status,updatedAt:serverTimestamp()});setNotice("Request status saved. The customer will see the updated status in their account.");}
  catch(cause){setError(cause instanceof Error?cause.message:"Could not update this request.");}
  finally{setSaving("");}
 }
 return <main className="lf-admin lf-workspace"><header className="lf-admin-top"><Link className="lf-brand" href="/"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>OPERATIONS</small></span></Link><div><span>Staff workspace · live Firestore records</span><button onClick={()=>void signOut(staffAuth)}>Sign out</button></div></header>
 <div className="lf-admin-content"><div className="lf-admin-title"><div><p className="lf-eyebrow">OPERATIONS OVERVIEW</p><h1>The work,<br/><em>in motion.</em></h1><p>Review new enquiries, check rental requirements and keep customer-facing statuses accurate.</p></div><a href="tel:+26773706331">Lefifi contact · +267 73 706 331</a></div>
 <div className="lf-metrics"><article><span>All requests</span><strong>{records.length}</strong><small>Saved in Firestore</small></article><article><span>Needs attention</span><strong>{needsAction}</strong><small>New, reviewing or quoted</small></article><article><span>Event enquiries</span><strong>{events.length}</strong><small>Planning and production</small></article><article><span>Equipment hire</span><strong>{rentals.length}</strong><small>Rental requests</small></article></div>
 <section className="lf-inventory">
   <div className="lf-ops-toolbar"><div><h2>Equipment register</h2><p>Track Lefifi-owned assets separately from supplier-sourced equipment.</p></div><span className="lf-asset-count">{equipment.length} records</span></div>
   <form className="lf-asset-form" onSubmit={saveAsset}>
    <label>Equipment / item<input value={assetName} onChange={e=>setAssetName(e.target.value)} required placeholder="e.g. LED screen panel"/></label>
    <label>Category<input value={assetCategory} onChange={e=>setAssetCategory(e.target.value)} required placeholder="Screens, furniture, sound…"/></label>
    <label>Source<select value={assetSource} onChange={e=>setAssetSource(e.target.value as "owned"|"supplier")}><option value="owned">Owned by Lefifi</option><option value="supplier">Supplier-sourced</option></select></label>
    <label>Quantity<input type="number" min="1" step="1" value={assetQuantity} onChange={e=>setAssetQuantity(e.target.value)} required/></label>
    <label>Operational status<select value={assetStatus} onChange={e=>setAssetStatus(e.target.value)}>{["available","reserved","deployed","returned","maintenance"].map(s=><option key={s} value={s} disabled={s==="quoted"&&record.quoteAmount===undefined}>{s.replaceAll("_"," ")}</option>)}</select></label>
    <label>Supplier (if applicable)<input value={assetSupplier} onChange={e=>setAssetSupplier(e.target.value)} placeholder="Supplier name"/></label>
    <label className="lf-asset-notes">Notes<textarea rows={2} value={assetNotes} onChange={e=>setAssetNotes(e.target.value)} placeholder="Specifications, location or maintenance notes"/></label>
    <div className="lf-asset-form-actions"><button type="submit" disabled={saving==="equipment"}>{saving==="equipment"?"Saving…":editingAsset?"Save asset changes":"Add equipment record"}</button>{editingAsset&&<button type="button" onClick={()=>{setEditingAsset("");setAssetName("");setAssetCategory("");setAssetSource("owned");setAssetQuantity("1");setAssetStatus("available");setAssetSupplier("");setAssetNotes("");}}>Cancel edit</button>}</div>
   </form>
   {equipment.length===0?<p className="lf-asset-empty">No equipment records yet. Add an item when ownership, category and quantity have been confirmed.</p>:<div className="lf-asset-list">{equipment.map(item=><article key={item.id}><div><strong>{item.name}</strong><span>{item.category} · Qty {item.quantity}</span></div><div><b>{item.source==="owned"?"Lefifi-owned":"Supplier-sourced"}</b><small>{item.supplier||"No supplier recorded"} · {item.status}</small></div><p>{item.notes||"No notes recorded."}</p><div className="lf-asset-actions"><button type="button" onClick={()=>editAsset(item)}>Edit</button><button type="button" onClick={()=>void removeAsset(item.id)}>Delete</button></div></article>)}</div>}
  </section>
 <div className="lf-ops-toolbar"><div><h2>Incoming work</h2><p>Live records update when a customer submits or staff changes a status.</p></div><label>Filter <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label></div>
 {loading?<div className="lf-state">Connecting to Lefifi request records…</div>:error?<div className="lf-state lf-error">Live records could not be loaded: {error}</div>:filtered.length===0?<div className="lf-state"><h2>{records.length?"No requests in this view":"No customer requests yet"}</h2><p>{records.length?"Change the status filter to see other work.":"New event enquiries and equipment hire requests will appear here as soon as customers submit them."}</p></div>:<div className="lf-ops-list">{filtered.map(record=><article className="lf-ops-record" key={record.collection+record.id}><div className="lf-ops-record-head"><div><span className="lf-record-kind">{record.kind}</span><h3>{record.kind==="Event enquiry"?(record.eventType||"Event enquiry"):(record.items||[]).join(", ")}</h3></div><span className={"lf-status lf-status-"+record.status}>{record.status.replaceAll("_"," ")}</span></div><div className="lf-ops-facts"><span><small>Customer</small><strong>{record.customerName}</strong></span><span><small>Phone</small><a href={"tel:"+record.phone}>{record.phone}</a></span><span><small>Submitted</small><strong>{time(record.createdAt)}</strong></span>{record.email&&<span><small>Email</small><a href={"mailto:"+record.email}>{record.email}</a></span>}{record.eventDate&&<span><small>Event / hire date</small><strong>{record.eventDate}{record.returnDate?" → "+record.returnDate:""}</strong></span>}{record.guestCount&&<span><small>Guests</small><strong>{record.guestCount}</strong></span>}{(record.location||record.deliveryLocation)&&<span><small>Location</small><strong>{record.location||record.deliveryLocation}</strong></span>}{record.deliveryRequired!==undefined&&<span><small>Delivery</small><strong>{record.deliveryRequired?"Requested":"Not requested"}</strong></span>}</div>
 {record.brief&&<p className="lf-ops-brief">{record.brief}</p>}{record.notes&&<p className="lf-ops-brief">{record.notes}</p>}
 <div className="lf-quote-editor"><div><strong>{record.quoteAmount!==undefined?"Quote on file":"Prepare a quote"}</strong>{record.quoteAmount!==undefined&&<b>P{record.quoteAmount.toLocaleString("en-BW",{minimumFractionDigits:2,maximumFractionDigits:2})}</b>}</div><input aria-label="Quote amount in Pula" type="number" min="0.01" step="0.01" placeholder="Amount (P)" value={quoteAmounts[record.id]??(record.quoteAmount!==undefined?String(record.quoteAmount):"")} onChange={e=>setQuoteAmounts(current=>({...current,[record.id]:e.target.value}))}/><input aria-label="Quote details" placeholder="Scope / inclusions / exclusions" value={quoteDetails[record.id]??record.quoteDetails??""} onChange={e=>setQuoteDetails(current=>({...current,[record.id]:e.target.value}))}/><button type="button" disabled={saving==="quote:"+record.id} onClick={()=>void saveQuote(record.collection,record.id)}>{saving==="quote:"+record.id?"Saving quote…":"Save quote"}</button></div>
 <div className="lf-ops-actions"><span>Reference {record.id.slice(0,8).toUpperCase()}</span><label>Update status<select value={record.status} disabled={saving===record.collection+":"+record.id} onChange={e=>void changeStatus(record.collection,record.id,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label></div></article>)}</div>}
 {notice&&<p className="lf-success-inline" role="status">{notice}</p>}{error&&<p className="lf-error" role="alert">{error}</p>}
 <p className="lf-admin-disclaimer">This workspace records customer requests and staff status updates. It does not confirm availability, create quotes, verify payments or dispatch equipment automatically.</p>
 </div></main>;
}
export default function AdminPage(){return <AdminGate><Workspace/></AdminGate>}

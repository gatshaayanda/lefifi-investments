"use client";

import Link from "next/link";
import { ArrowUpRight, AudioLines, CalendarDays, ClipboardList, Home, MessageCircle, Monitor, Package, PanelsTopLeft, Sofa, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import ServiceGuide from "@/app/ServiceGuide";
import { STARTER_SERVICES } from "@/lib/services/catalog";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";

type RequestKind = "event" | "rental";
type PublicService = { id:string; name:string; detail:string; price:number; active:boolean; mark?:string };
const serviceIcons = [CalendarDays, Sofa, Monitor, AudioLines, PanelsTopLeft, Package];
function clean(value: FormDataEntryValue | null) { return String(value ?? "").trim(); }

export default function HomePage() {
  const [kind, setKind] = useState<RequestKind>("event");
  const [catalog, setCatalog] = useState<PublicService[]>(STARTER_SERVICES.map(item=>({...item})));
  const guideServices = catalog.map(item => ({ id:item.id, name:item.name, price:item.price||0, description:item.detail, media:"", mediaType:"image" as const, active:item.active }));
  const [online, setOnline] = useState(true);
  useEffect(() => { const stop=onSnapshot(collection(db,"services"),snap=>{ const live=snap.docs.map(d=>({id:d.id,...d.data()} as PublicService)).filter(item=>item.active!==false); setCatalog(snap.empty ? STARTER_SERVICES.map(item=>({...item})) : live); }); return ()=>stop(); }, []);
  useEffect(() => { setOnline(navigator.onLine); const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online",on); window.addEventListener("offline",off); return () => { window.removeEventListener("online",on); window.removeEventListener("offline",off); }; }, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<{ id: string; kind: RequestKind } | null>(null);
  const [eventBrief, setEventBrief] = useState("");
  const [rentalItems, setRentalItems] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!navigator.onLine) { setError("You are offline. This request has not been sent. Reconnect and submit it again."); return; }
    if (!hasFirebaseWebConfig) {
      setError("Online requests are not configured on this deployment yet. Please contact Lefifi directly on +267 73 706 331.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const customerName = clean(form.get("customerName"));
    const phone = clean(form.get("phone"));
    const email = clean(form.get("email"));
    if (!customerName || !phone) { setError("Add your name and contact number so the team can respond."); return; }
    setBusy(true); setError(""); setMessage("Connecting your request to Lefifi…");
    try {
      const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
      const now = serverTimestamp();
      await setDoc(doc(db, "customers", user.uid), {
        uid: user.uid, name: customerName, email, phone, createdAt: now, updatedAt: now,
      }, { merge: true });
      let recordId = "";
      if (kind === "event") {
        const eventType = clean(form.get("eventType"));
        const eventDate = clean(form.get("eventDate"));
        const location = clean(form.get("location"));
        const brief = clean(form.get("brief"));
        const guestCountRaw = clean(form.get("guestCount"));
        const record = await addDoc(collection(db, "eventEnquiries"), {
          customerId: user.uid, customerName, email, phone, eventType, eventDate, location, brief,
          ...(guestCountRaw ? { guestCount: Number(guestCountRaw) } : {}),
          status: "new", createdAt: now, updatedAt: now,
        });
        recordId = record.id;
      } else {
        const items = clean(form.get("items")).split(/\n|,/).map(item => item.trim()).filter(Boolean);
        if (!items.length) throw new Error("Tell us which equipment or services you need.");
        const eventDate = clean(form.get("eventDate"));
        const returnDate = clean(form.get("returnDate"));
        if (returnDate && returnDate < eventDate) throw new Error("The return date must be on or after the required-from date.");
        const record = await addDoc(collection(db, "rentalRequests"), {
          customerId: user.uid, customerName, email, phone, items,
          eventDate, returnDate,
          deliveryLocation: clean(form.get("deliveryLocation")),
          deliveryRequired: form.get("deliveryRequired") === "yes",
          servicingRequirement: clean(form.get("servicingRequirement")),
          notes: clean(form.get("notes")), status: "new", createdAt: now, updatedAt: now,
        });
        recordId = record.id;
      }
      setSaved({ id: recordId, kind });
      setMessage(kind === "event" ? "Your event enquiry has been received." : "Your equipment request has been received.");
      formElement.reset();
       setEventBrief(""); setRentalItems("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not save this request. Please try again.");
      setMessage("");
    } finally { setBusy(false); }
  }

  function chooseOffering(service: { name: string }) {
    const rental = service.name.toLowerCase().includes("hire");
    
    setKind(rental ? "rental" : "event");
    if (rental) setRentalItems(service.name); else setEventBrief("I’m interested in: " + service.name + ". ");
    setError(""); setMessage(""); setSaved(null);
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
  }

  return <main className="lefifi">
    <div className="lf-topline"><div className="lf-container"><span>GABORONE · BOTSWANA</span><a href="tel:+26773706331">Call +267 73 706 331</a></div></div>
    <header className="lf-header"><div className="lf-container lf-nav">
      <Link className="lf-brand" href="/" aria-label="Lefifi Investments home"><span className="lf-brand-mark"><img src="/lefifi.jpg" alt="Lefifi Investments" /></span></Link>
      <nav aria-label="Main navigation"><a href="#services">Services</a><a href="#request">Enquire</a></nav>
      <Link className="lf-nav-account" href="/account">My requests <span>↗</span></Link>
    </div></header>

    <section className="lf-hero">
      <div className="lf-hero-image" role="img" aria-label="Atmospheric event lighting and production setup" />
      <div className="lf-container lf-hero-content">
        <p className="lf-eyebrow"><span /> EVENTS · RENTALS · PRODUCTION</p>
        <h1>Make the moment<br/><em>come together.</em></h1>
        <p className="lf-hero-copy">From event planning and furniture setups to screens, sound, lighting and stage production — one team to help bring the details together.</p>
        <div className="lf-actions"><a className="lf-primary" href="#request">Start an enquiry <span>↗</span></a><a className="lf-secondary" href="#services">Explore services</a></div>
        <div className="lf-hero-foot"><span>01 / 06</span><span>PLANNED WITH PURPOSE. DELIVERED WITH CARE.</span></div>
      </div>
    </section>

    <section className="lf-shortcuts" aria-label="Quick destinations"><div className="lf-container lf-shortcut-grid">
      <button type="button" onClick={()=>chooseOffering({name:"Event planning & management"})}><span className="lf-shortcut-icon" aria-hidden="true"><CalendarDays size={19} strokeWidth={1.6}/></span><strong>Plan an event</strong><small>Brief the team</small><span className="lf-shortcut-action" aria-hidden="true">OPEN <ArrowUpRight size={15}/></span></button>
      <button type="button" onClick={()=>chooseOffering({name:"Sound & lighting"})}><span className="lf-shortcut-icon" aria-hidden="true"><AudioLines size={19} strokeWidth={1.6}/></span><strong>Production</strong><small>Sound, light & stage</small><span className="lf-shortcut-action" aria-hidden="true">OPEN <ArrowUpRight size={15}/></span></button>
      <button type="button" onClick={()=>chooseOffering({name:"Mobile toilet hire"})}><span className="lf-shortcut-icon" aria-hidden="true"><Package size={19} strokeWidth={1.6}/></span><strong>Hire equipment</strong><small>Share dates & location</small><span className="lf-shortcut-action" aria-hidden="true">OPEN <ArrowUpRight size={15}/></span></button>
      <Link href="/account"><span className="lf-shortcut-icon" aria-hidden="true"><ClipboardList size={19} strokeWidth={1.6}/></span><strong>My requests</strong><small>Check your updates</small><span className="lf-shortcut-action" aria-hidden="true">OPEN <ArrowUpRight size={15}/></span></Link>
    </div></section>

    <section className="lf-section" id="services"><div className="lf-container">
      <div className="lf-section-heading"><div><p className="lf-eyebrow">WHAT WE BRING TOGETHER</p><h2>One brief. <em>Many moving parts.</em></h2></div><p>Explore the services and starting prices. Choose what you need and send a short brief.</p></div>
      <div className="lf-service-grid">{catalog.map((item,index)=><button className="lf-service" type="button" key={item.id} onClick={()=>chooseOffering({name:item.name})}><span className="lf-service-icon" aria-hidden="true">{(() => { const Icon=serviceIcons[index % serviceIcons.length]; return <Icon size={20} strokeWidth={1.55}/>; })()}</span><span className="lf-service-title">{item.name}</span><span className="lf-service-detail">{item.detail}</span><span className="lf-service-price">{item.price>0?`P${Number(item.price).toLocaleString("en-BW")}`:"Ask for price"}</span><span className="lf-service-arrow" aria-hidden="true"><ArrowUpRight size={17}/></span></button>)}</div>
    </div></section>

    <section className="lf-request-section" id="request"><div className="lf-container lf-request-layout">
      <div className="lf-request-intro"><p className="lf-eyebrow">LET’S GET THE DETAILS</p><h2>Tell us what<br/><em>you have in mind.</em></h2><p>Tell us the essentials. The team will confirm availability and the final quote before anything is booked.</p><div className="lf-contact-card"><span>Rather call?</span><a href="tel:+26773706331">+267 73 706 331</a></div></div>
      <div className="lf-form-panel">
        <div className="lf-form-tabs" role="tablist" aria-label="Choose enquiry type"><button type="button" role="tab" aria-selected={kind === "event"} className={kind === "event" ? "active" : ""} onClick={()=>{setKind("event");setSaved(null);setError("");setRentalItems("");}}>Event enquiry</button><button type="button" role="tab" aria-selected={kind === "rental"} className={kind === "rental" ? "active" : ""} onClick={()=>{setKind("rental");setSaved(null);setError("");setEventBrief("");}}>Equipment hire</button></div>
        {saved ? <div className="lf-success" role="status"><span className="lf-success-icon">✓</span><p className="lf-eyebrow">REQUEST RECEIVED</p><h3>Thank you. We have it.</h3><p>{message} The team still needs to review the details and confirm the next step. This is not yet a confirmed booking.</p><div className="lf-reference">REFERENCE <strong>{saved.id.slice(0,8).toUpperCase()}</strong></div><Link href="/account" className="lf-primary">Track your request <span>↗</span></Link><button className="lf-reset" type="button" onClick={()=>{setSaved(null);setMessage("");}}>Send another enquiry</button></div> :
        <form className="lf-form" onSubmit={submit}>
          <div className="lf-form-heading"><span>{kind === "event" ? "01 / EVENT BRIEF" : "02 / EQUIPMENT REQUEST"}</span><small>Fields marked * are required</small></div>
          <div className="lf-form-grid"><label>Your name *<input name="customerName" autoComplete="name" required placeholder="Full name"/></label><label>Phone / WhatsApp *<input name="phone" type="tel" autoComplete="tel" required placeholder="+267 …"/></label><label className="lf-full">Email <span>(optional)</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com"/></label>
          {kind === "event" ? <>
            <label>Event type *<select name="eventType" required defaultValue=""><option value="" disabled>Select event type</option><option>Corporate event</option><option>Conference / summit</option><option>Gala / awards</option><option>Wedding / celebration</option><option>Brand activation</option><option>Other</option></select></label>
            <label>Event date *<input name="eventDate" type="date" required min={new Date().toISOString().slice(0,10)}/></label>
            <label>Expected guests <span>(optional)</span><input name="guestCount" type="number" min="1" placeholder="e.g. 150"/></label>
            <label>Event location *<input name="location" required placeholder="Venue or area"/></label>
            <label className="lf-full">What are you planning? *<textarea name="brief" required rows={4} placeholder="Share the event, services needed, preferred setup and anything else we should know." value={eventBrief} onChange={e=>setEventBrief(e.target.value)}/></label>
          </> : <>
            <label>Required from *<input name="eventDate" type="date" required min={new Date().toISOString().slice(0,10)}/></label>
            <label>Return / end date<input name="returnDate" type="date" min={new Date().toISOString().slice(0,10)}/></label>
            <label className="lf-full">Equipment or services needed *<textarea name="items" required rows={3} placeholder="List each item or service on a new line" value={rentalItems} onChange={e=>setRentalItems(e.target.value)}/></label>
            <label className="lf-full">Delivery / event location *<input name="deliveryLocation" required placeholder="Venue, site or area"/></label>
            <label className="lf-full">Do you need delivery and collection?<select name="deliveryRequired" defaultValue="yes"><option value="yes">Yes, please include it in the quote</option><option value="no">No, I will arrange collection</option></select></label>
            <label className="lf-full">Servicing / cleaning during hire<select name="servicingRequirement" defaultValue="discuss"><option value="discuss">Discuss with Lefifi</option><option value="yes">Yes, please include it in the request</option><option value="no">Not required</option></select></label>
            <label className="lf-full">Additional details <textarea name="notes" rows={3} placeholder="Quantities, access, setup requirements or timing"/></label>
          </>}
          </div>
          <button className="lf-submit" type="submit" disabled={busy || !hasFirebaseWebConfig || !online}>{busy ? "Sending your request…" : online ? "Send request" : "Reconnect to send"} <span>↗</span></button>
          <p className="lf-form-note">The team will review your request and confirm the quote. Sending this form does not book or reserve equipment.</p>
          {!online && <p className="lf-error" role="status">Offline · This form will not send or queue a request until you reconnect.</p>}{message && <p className="lf-inline-message" role="status">{message}</p>}{error && <p className="lf-error" role="alert">{error}</p>}
          {!hasFirebaseWebConfig && <p className="lf-error" role="status">Online request saving is not configured on this deployment. Please call +267 73 706 331.</p>}
        </form>}
      </div>
    </div></section>

    <footer className="lf-footer"><div className="lf-container lf-footer-bottom"><span>© {new Date().getFullYear()} Lefifi Investments · Gaborone</span><a href="tel:+26773706331">Call +267 73 706 331</a></div></footer>
    <nav className="lf-mobile-nav" aria-label="Quick navigation"><a href="#"><Home size={19}/><span>Home</span></a><a href="#services"><Tag size={19}/><span>Services</span></a><a href="#request"><MessageCircle size={19}/><span>Enquire</span></a><Link href="/account"><ClipboardList size={19}/><span>My requests</span></Link></nav><ServiceGuide view="shop" services={guideServices} requestCount={0} onChooseService={chooseOffering} onOpenAccount={()=>{window.location.href="/account";}} onOpenAdmin={()=>{}} onOpenStorefront={()=>window.scrollTo({top:0,behavior:"smooth"})}/>
  </main>;
}

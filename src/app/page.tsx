"use client";

import Link from "next/link";
import { useState } from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import ServiceGuide from "@/app/ServiceGuide";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";

type RequestKind = "event" | "rental";
const offerings = [
  { title: "Event planning & management", detail: "Planning, coordination and on-the-day delivery for corporate and private events.", mark: "01" },
  { title: "Furniture & event styling", detail: "Classy furniture setups, tables, seating and considered event environments.", mark: "02" },
  { title: "LED screens & visuals", detail: "Indoor and outdoor LED screen requirements for presentations and live events.", mark: "03" },
  { title: "Sound & lighting", detail: "Event sound, lighting and technical production requirements.", mark: "04" },
  { title: "Stage design & production", detail: "Stage concepts, staging and production coordination.", mark: "05" },
  { title: "Mobile toilet hire", detail: "Mobile toilet rental enquiries for event and site requirements.", mark: "06" },
];
const guideServices = offerings.map((item, index) => ({ id: String(index), name: item.title, price: 0, description: item.detail, media: "", mediaType: "image" as const, active: true }));

function clean(value: FormDataEntryValue | null) { return String(value ?? "").trim(); }

export default function HomePage() {
  const [kind, setKind] = useState<RequestKind>("event");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<{ id: string; kind: RequestKind } | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
      let record;
      if (kind === "event") {
        const eventType = clean(form.get("eventType"));
        const eventDate = clean(form.get("eventDate"));
        const location = clean(form.get("location"));
        const brief = clean(form.get("brief"));
        const guestCountRaw = clean(form.get("guestCount"));
        record = await addDoc(collection(db, "eventEnquiries"), {
          customerId: user.uid, customerName, email, phone, eventType, eventDate, location, brief,
          ...(guestCountRaw ? { guestCount: Number(guestCountRaw) } : {}),
          status: "new", createdAt: now, updatedAt: now,
        });
      } else {
        const items = clean(form.get("items")).split(/\n|,/).map(item => item.trim()).filter(Boolean);
        if (!items.length) throw new Error("Tell us which equipment or services you need.");
        record = await addDoc(collection(db, "rentalRequests"), {
          customerId: user.uid, customerName, email, phone, items,
          eventDate: clean(form.get("eventDate")), returnDate: clean(form.get("returnDate")),
          deliveryLocation: clean(form.get("deliveryLocation")),
          deliveryRequired: form.get("deliveryRequired") === "yes",
          notes: clean(form.get("notes")), status: "new", createdAt: now, updatedAt: now,
        });
      }
      setSaved({ id: record.id, kind });
      setMessage(kind === "event" ? "Your event enquiry has been received." : "Your equipment request has been received.");
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not save this request. Please try again.");
      setMessage("");
    } finally { setBusy(false); }
  }

  function chooseOffering(service: { name: string }) {
    setSelectedService(service.name);
    setKind(service.name.toLowerCase().includes("hire") ? "rental" : "event");
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
  }

  return <main className="lefifi">
    <div className="lf-topline"><div className="lf-container"><span>GABORONE · BOTSWANA</span><a href="tel:+26773706331">Call +267 73 706 331</a></div></div>
    <header className="lf-header"><div className="lf-container lf-nav">
      <a className="lf-brand" href="/" aria-label="Lefifi Investments home"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>INVESTMENTS</small></span></a>
      <nav aria-label="Main navigation"><a href="#services">Services</a><a href="#about">About</a><a href="#request">Enquire</a></nav>
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

    <section className="lf-trust-strip"><div className="lf-container"><span>EVENTS</span><i/><span>FURNITURE</span><i/><span>TECHNICAL PRODUCTION</span><i/><span>EQUIPMENT HIRE</span></div></section>

    <section className="lf-section" id="services"><div className="lf-container">
      <div className="lf-section-heading"><div><p className="lf-eyebrow">WHAT WE BRING TOGETHER</p><h2>One brief. <em>Many moving parts.</em></h2></div><p>Tell us what you are planning. We’ll review the details and come back with the right next step.</p></div>
      <div className="lf-service-grid">{offerings.map(item=><button className="lf-service" type="button" key={item.mark} onClick={()=>chooseOffering({name:item.title})}><span className="lf-service-no">{item.mark}</span><span className="lf-service-title">{item.title}</span><span className="lf-service-detail">{item.detail}</span><span className="lf-service-arrow">↗</span></button>)}</div>
    </div></section>

    <section className="lf-feature" id="about"><div className="lf-feature-image" /><div className="lf-feature-copy"><p className="lf-eyebrow">FROM FIRST IDEA TO FINAL DETAIL</p><h2>Good events are<br/><em>well put together.</em></h2><p>Lefifi Investments supports event requirements across planning, furniture and styling, technical production and equipment hire. Share the occasion, the location and what you have in mind — the team can help shape the scope with you.</p><a href="#request" className="lf-text-link">Talk to the team <span>↗</span></a></div></section>

    <section className="lf-request-section" id="request"><div className="lf-container lf-request-layout">
      <div className="lf-request-intro"><p className="lf-eyebrow">LET’S GET THE DETAILS</p><h2>Tell us what<br/><em>you have in mind.</em></h2><p>Send an event brief or an equipment hire request. The team will review it and confirm availability, scope and pricing with you. Submitting a request does not confirm a booking.</p><div className="lf-contact-card"><span>Prefer to speak directly?</span><a href="tel:+26773706331">+267 73 706 331</a><small>Gaborone, Botswana · P.O. Box 201958, Bontleng</small></div></div>
      <div className="lf-form-panel">
        <div className="lf-form-tabs" role="tablist" aria-label="Choose enquiry type"><button type="button" className={kind === "event" ? "active" : ""} onClick={()=>{setKind("event");setSaved(null);setError("");}}>Event enquiry</button><button type="button" className={kind === "rental" ? "active" : ""} onClick={()=>{setKind("rental");setSaved(null);setError("");}}>Equipment hire</button></div>
        {saved ? <div className="lf-success" role="status"><span className="lf-success-icon">✓</span><p className="lf-eyebrow">REQUEST RECEIVED</p><h3>Thank you. We have it.</h3><p>{message} The team still needs to review the details and confirm the next step. This is not yet a confirmed booking.</p><div className="lf-reference">REFERENCE <strong>{saved.id.slice(0,8).toUpperCase()}</strong></div><Link href="/account" className="lf-primary">Track your request <span>↗</span></Link><button className="lf-reset" type="button" onClick={()=>{setSaved(null);setMessage("");}}>Send another enquiry</button></div> :
        <form className="lf-form" onSubmit={submit}>
          <div className="lf-form-heading"><span>{kind === "event" ? "01 / EVENT BRIEF" : "02 / EQUIPMENT REQUEST"}</span><small>Fields marked * are required</small></div>
          <div className="lf-form-grid"><label>Your name *<input name="customerName" autoComplete="name" required placeholder="Full name"/></label><label>Phone / WhatsApp *<input name="phone" type="tel" autoComplete="tel" required placeholder="+267 …"/></label><label className="lf-full">Email <span>(optional)</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com"/></label>
          {kind === "event" ? <>
            <label>Event type *<select name="eventType" required defaultValue=""><option value="" disabled>Select event type</option><option>Corporate event</option><option>Conference / summit</option><option>Gala / awards</option><option>Wedding / celebration</option><option>Brand activation</option><option>Other</option></select></label>
            <label>Event date *<input name="eventDate" type="date" required min={new Date().toISOString().slice(0,10)}/></label>
            <label>Expected guests <span>(optional)</span><input name="guestCount" type="number" min="1" placeholder="e.g. 150"/></label>
            <label>Event location *<input name="location" required placeholder="Venue or area"/></label>
            <label className="lf-full">What are you planning? *<textarea name="brief" required rows={4} placeholder="Share the event, services needed, preferred setup and anything else we should know." defaultValue={selectedService ? "I’m interested in: "+selectedService+". " : ""}/></label>
          </> : <>
            <label>Required from *<input name="eventDate" type="date" required min={new Date().toISOString().slice(0,10)}/></label>
            <label>Return / end date<input name="returnDate" type="date" min={new Date().toISOString().slice(0,10)}/></label>
            <label className="lf-full">Equipment or services needed *<textarea name="items" required rows={3} placeholder="List each item or service on a new line"/></label>
            <label className="lf-full">Delivery / event location *<input name="deliveryLocation" required placeholder="Venue, site or area"/></label>
            <label className="lf-full">Do you need delivery and collection?<select name="deliveryRequired" defaultValue="yes"><option value="yes">Yes, please include it in the quote</option><option value="no">No, I will arrange collection</option></select></label>
            <label className="lf-full">Additional details <textarea name="notes" rows={3} placeholder="Quantities, access, setup requirements or timing"/></label>
          </>}
          </div>
          <button className="lf-submit" type="submit" disabled={busy || !hasFirebaseWebConfig}>{busy ? "Sending your request…" : "Send request"} <span>↗</span></button>
          <p className="lf-form-note">Your details are used to respond to this enquiry. Availability, final pricing and booking confirmation are handled by the Lefifi team.</p>
          {message && <p className="lf-inline-message" role="status">{message}</p>}{error && <p className="lf-error" role="alert">{error}</p>}
          {!hasFirebaseWebConfig && <p className="lf-error" role="status">Online request saving is not configured on this deployment. Please call +267 73 706 331.</p>}
        </form>}
      </div>
    </div></section>

    <footer className="lf-footer"><div className="lf-container lf-footer-main"><a className="lf-brand" href="#"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>INVESTMENTS</small></span></a><p>Events, equipment and production.<br/>Gaborone, Botswana.</p><a href="tel:+26773706331">+267 73 706 331</a></div><div className="lf-container lf-footer-bottom"><span>© {new Date().getFullYear()} Lefifi Investments</span><Link href="/account">Customer requests</Link></div></footer>
    <ServiceGuide view="shop" services={guideServices} requestCount={0} onChooseService={chooseOffering} onOpenAccount={()=>{window.location.href="/account";}} onOpenAdmin={()=>{}} onOpenStorefront={()=>window.scrollTo({top:0,behavior:"smooth"})}/>
  </main>;
}

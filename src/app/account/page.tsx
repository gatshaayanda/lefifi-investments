"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";

type Stamp = { toDate?: () => Date } | null;
type RecordItem = {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  createdAt?: Stamp;
  updatedAt?: Stamp;
  eventType?: string;
  eventDate?: string;
  location?: string;
  brief?: string;
  guestCount?: number;
  items?: string[];
  returnDate?: string;
  deliveryLocation?: string;
  deliveryRequired?: boolean;
  servicingRequirement?: string;
  notes?: string;
  quoteAmount?: number;
  quoteDetails?: string;
  quoteUpdatedAt?: Stamp;
  kind: "event" | "rental";
};

const STATUS: Record<string, { label: string; summary: string }> = {
  new: { label: "Received", summary: "Lefifi has received your request. The team will review the details and decide the next step." },
  reviewing: { label: "Under review", summary: "The team is reviewing your brief, dates and requirements. They may contact you if they need more detail." },
  quoted: { label: "Quote ready", summary: "A quote has been recorded for your request. Review the scope and amount below, then contact Lefifi to discuss it." },
  confirmed: { label: "Confirmed", summary: "Lefifi has marked this request as confirmed. Contact the team if you need to clarify any arrangements." },
  in_progress: { label: "In progress", summary: "The team has marked this work as underway. Contact Lefifi if you need to coordinate event or hire details." },
  completed: { label: "Completed", summary: "Lefifi has marked this request as completed." },
  declined: { label: "Not proceeding", summary: "The team has marked this request as not proceeding. Contact Lefifi if you need clarification." },
};

function stampDate(value?: Stamp) {
  try {
    return value?.toDate ? value.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date pending";
  } catch { return "Date pending"; }
}
function stampTime(value?: Stamp) {
  try {
    return value?.toDate ? value.toDate().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not updated yet";
  } catch { return "Not updated yet"; }
}
function statusFor(value: string) {
  return STATUS[value] || { label: value.replaceAll("_", " "), summary: "The team will update this request as it moves through the review process." };
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<RecordItem[]>([]);
  const [rentals, setRentals] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "event" | "rental">("all");

  useEffect(() => {
    let stopEvents = () => {};
    let stopRentals = () => {};
    const stopAuth = onAuthStateChanged(auth, next => {
      stopEvents(); stopRentals();
      setUser(next); setEvents([]); setRentals([]); setError("");
      if (!next) { setLoading(false); return; }
      setLoading(true);
      let eventsReady = false;
      let rentalsReady = false;
      const finishLoading = () => setLoading(!(eventsReady && rentalsReady));
      stopEvents = onSnapshot(
        query(collection(db, "eventEnquiries"), where("customerId", "==", next.uid), orderBy("createdAt", "desc")),
        snapshot => { setEvents(snapshot.docs.map(item => ({ id: item.id, ...item.data(), kind: "event" } as RecordItem))); eventsReady = true; finishLoading(); },
        () => { setError("We could not load your event enquiries. Check your connection and try again."); eventsReady = true; finishLoading(); }
      );
      stopRentals = onSnapshot(
        query(collection(db, "rentalRequests"), where("customerId", "==", next.uid), orderBy("createdAt", "desc")),
        snapshot => { setRentals(snapshot.docs.map(item => ({ id: item.id, ...item.data(), kind: "rental" } as RecordItem))); rentalsReady = true; finishLoading(); },
        () => { setError("We could not load your equipment requests. Check your connection and try again."); rentalsReady = true; finishLoading(); }
      );
    });
    return () => { stopAuth(); stopEvents(); stopRentals(); };
  }, []);

  const all = useMemo(() => [...events, ...rentals].sort((a, b) =>
    (b.createdAt?.toDate?.().getTime() ?? 0) - (a.createdAt?.toDate?.().getTime() ?? 0)
  ), [events, rentals]);
  const visible = all.filter(item => filter === "all" || item.kind === filter);
  const openCount = all.filter(item => !["completed", "declined"].includes(item.status)).length;
  const quoteCount = all.filter(item => item.status === "quoted" && item.quoteAmount !== undefined).length;

  return <main className="lefifi lf-inner">
    <header className="lf-header"><div className="lf-container lf-nav">
      <Link className="lf-brand" href="/" aria-label="Lefifi Investments home"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>INVESTMENTS</small></span></Link>
      <Link className="lf-nav-account" href="/">Back to Lefifi <span>↗</span></Link>
    </div></header>

    <section className="lf-account-wrap"><div className="lf-container lf-account-container">
      <div className="lf-account-heading">
        <div><p className="lf-eyebrow">YOUR LEFIFI · PRIVATE REQUEST HISTORY</p><h1 className="lf-inner-title">My requests.</h1><p className="lf-account-lead">One place for the event briefs and equipment hire requests you have sent to the team.</p></div>
        <Link className="lf-primary" href="/#request">New enquiry <span>↗</span></Link>
      </div>

      {!hasFirebaseWebConfig ? <div className="lf-state lf-error"><h2>Request history is unavailable</h2><p>This deployment is not connected to the customer records service yet. You can still contact Lefifi directly.</p><a className="lf-primary" href="tel:+26773706331">Call Lefifi <span>↗</span></a></div>
      : loading ? <div className="lf-state lf-account-loading" role="status"><span className="lf-loading-dot"/>Connecting to your saved requests…</div>
      : !user ? <div className="lf-state"><h2>No active request session</h2><p>Your guest request history is linked to the browser you used when submitting an enquiry. Return using that same browser session to see your records.</p><Link className="lf-primary" href="/#request">Start an enquiry <span>↗</span></Link></div>
      : error ? <div className="lf-state lf-error" role="alert"><h2>Requests could not be loaded</h2><p>{error}</p><button className="lf-account-retry" type="button" onClick={() => window.location.reload()}>Try again</button></div>
      : <>
        <div className="lf-account-summary" aria-label="Request summary">
          <div><strong>{all.length}</strong><span>Total requests</span></div>
          <div><strong>{openCount}</strong><span>Still active</span></div>
          <div><strong>{quoteCount}</strong><span>Quotes recorded</span></div>
        </div>
        <div className="lf-account-toolbar">
          <div><strong>Request history</strong><span>{all.length} {all.length === 1 ? "record" : "records"}</span></div>
          <div className="lf-account-filters" role="group" aria-label="Filter request history">
            <button type="button" className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
            <button type="button" className={filter === "event" ? "active" : ""} aria-pressed={filter === "event"} onClick={() => setFilter("event")}>Events</button>
            <button type="button" className={filter === "rental" ? "active" : ""} aria-pressed={filter === "rental"} onClick={() => setFilter("rental")}>Hire</button>
          </div>
        </div>
        {visible.length ? <div className="lf-account-records">{visible.map(item => {
          const status = statusFor(item.status);
          const title = item.kind === "event" ? item.eventType || "Event enquiry" : (item.items || []).join(", ") || "Equipment hire request";
          const updated = stampTime(item.updatedAt || item.createdAt);
          return <article className="lf-account-record" key={item.id}>
            <div className="lf-account-record-head">
              <div><span className="lf-account-kind">{item.kind === "event" ? "EVENT ENQUIRY" : "EQUIPMENT HIRE"}</span><h2>{title}</h2></div>
              <span className={"lf-account-status lf-account-status-" + item.status}>{status.label}</span>
            </div>
            <div className="lf-account-meta"><span>REF <strong>{item.id.slice(0, 8).toUpperCase()}</strong></span><span>SUBMITTED {stampDate(item.createdAt)}</span></div>
            <div className="lf-account-facts">
              {item.eventDate && <div><small>{item.kind === "event" ? "Event date" : "Required from"}</small><strong>{item.eventDate}{item.returnDate ? " – " + item.returnDate : ""}</strong></div>}
              {(item.location || item.deliveryLocation) && <div><small>{item.kind === "event" ? "Location" : "Delivery / event location"}</small><strong>{item.location || item.deliveryLocation}</strong></div>}
              {item.guestCount && <div><small>Expected guests</small><strong>{item.guestCount.toLocaleString("en-BW")}</strong></div>}
              {item.deliveryRequired !== undefined && <div><small>Delivery / collection</small><strong>{item.deliveryRequired ? "Include in quote" : "Customer arranging collection"}</strong></div>}
              {item.servicingRequirement && <div><small>Servicing / cleaning</small><strong>{item.servicingRequirement === "yes" ? "Requested" : item.servicingRequirement === "no" ? "Not required" : "To discuss"}</strong></div>}
            </div>
            {(item.brief || item.notes) && <details className="lf-account-details"><summary>View request details</summary><p>{item.brief || item.notes}</p>{item.brief && item.notes && <p>{item.notes}</p>}</details>}
            <div className="lf-account-next"><strong>Current update · {status.label}</strong><p>{status.summary}</p><small>Last recorded update · {updated}</small></div>
            {item.quoteAmount !== undefined && <div className="lf-customer-quote"><span>QUOTE RECORDED BY LEFIFI</span><strong>P{item.quoteAmount.toLocaleString("en-BW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>{item.quoteDetails && <p>{item.quoteDetails}</p>}<small>This is a quote only, not a payment receipt or proof of booking. Contact the team to discuss the scope.</small></div>}
            <div className="lf-account-record-actions"><a href="tel:+26773706331">Call Lefifi</a><Link href="/#request">Send another enquiry</Link></div>
          </article>;
        })}</div> : <div className="lf-state"><h2>{all.length ? "No matching requests" : "Nothing here yet"}</h2><p>{all.length ? "Try another filter to see your other requests." : "Your submitted event enquiries and equipment hire requests will appear here, with the latest status recorded by Lefifi."}</p><Link className="lf-primary" href="/#request">Start your first enquiry <span>↗</span></Link></div>}
      </>}
      <p className="lf-account-privacy">Your request history is private to your guest session. Use the same browser to return to these records.</p>
    </div></section>

    <footer className="lf-footer"><div className="lf-container lf-footer-bottom"><span>© {new Date().getFullYear()} Lefifi Investments</span><a href="tel:+26773706331">+267 73 706 331</a></div></footer>
  </main>;
}

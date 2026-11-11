"use client";

import Link from "next/link";
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileText,
  MapPin, Package, Phone, ShieldCheck, Truck, Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db, hasFirebaseWebConfig } from "@/lib/firebase/client";
import "./account.css";

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
function money(value: number) {
  return "P" + Number(value).toLocaleString("en-BW", { maximumFractionDigits: 0 });
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

  return <main className="lefifi lf-inner lf-account-page">
    <header className="lf-header"><div className="lf-container lf-nav">
      <Link className="lf-brand" href="/" aria-label="Lefifi Investments home">
        <span className="lf-brand-mark"><img src="/lefifi.jpg" alt="Lefifi Investments" /></span>
      </Link>
      <Link className="lf-nav-account" href="/">Back to Lefifi <ArrowUpRight size={13} /></Link>
    </div></header>

    <section className="lf-account-wrap">
      <div className="lf-account-banner">
        <div className="lf-container lf-account-container">
          <div className="lf-account-heading">
            <div>
              <p className="lf-eyebrow"><ClipboardList size={13} /> CUSTOMER SPACE · REQUEST TRACKING</p>
              <h1 className="lf-inner-title">Your requests.</h1>
              <p className="lf-account-lead">Event briefs, equipment hire and the latest updates from the Lefifi team — together in one place.</p>
            </div>
            <Link className="lf-primary" href="/#request">New enquiry <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </div>

      <div className="lf-container lf-account-container lf-account-main">
        {!hasFirebaseWebConfig ? <div className="lf-state lf-error">
          <h2>Request history is unavailable</h2>
          <p>This deployment is not connected to the customer records service yet. You can still contact Lefifi directly.</p>
          <a className="lf-primary" href="tel:+26773706331">Call Lefifi <ArrowUpRight size={15} /></a>
        </div>
        : loading ? <div className="lf-state lf-account-loading" role="status"><span className="lf-loading-dot" />Connecting to your saved requests…</div>
        : !user ? <div className="lf-state">
          <h2>Your request space is ready</h2>
          <p>Submit an enquiry using this browser and your request history will appear here automatically. Return on the same browser to see staff updates and quotes.</p>
          <Link className="lf-primary" href="/#request">Start an enquiry <ArrowUpRight size={15} /></Link>
        </div>
        : error ? <div className="lf-state lf-error" role="alert">
          <h2>Requests could not be loaded</h2><p>{error}</p>
          <button className="lf-account-retry" type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
        : <>
          <div className="lf-account-summary" aria-label="Request summary">
            <div><span className="lf-account-summary-icon"><ClipboardList size={17} /></span><span className="lf-account-summary-copy"><strong>{all.length}</strong><span>Total requests</span></span></div>
            <div><span className="lf-account-summary-icon"><Clock3 size={17} /></span><span className="lf-account-summary-copy"><strong>{openCount}</strong><span>Still active</span></span></div>
            <div><span className="lf-account-summary-icon"><FileText size={17} /></span><span className="lf-account-summary-copy"><strong>{quoteCount}</strong><span>Quotes recorded</span></span></div>
          </div>

          <div className="lf-account-toolbar">
            <div><strong>Request history</strong><span>{all.length} {all.length === 1 ? "record" : "records"} · updates appear as the team records them</span></div>
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
            const StatusIcon = item.status === "confirmed" || item.status === "completed" ? CheckCircle2 : Clock3;
            return <article className="lf-account-record" key={item.id}>
              <div className="lf-account-record-head">
                <div>
                  <span className="lf-account-kind">{item.kind === "event" ? <CalendarDays size={12} /> : <Package size={12} />}{item.kind === "event" ? "EVENT ENQUIRY" : "EQUIPMENT HIRE"}</span>
                  <h2>{title}</h2>
                </div>
                <span className={"lf-account-status lf-account-status-" + item.status}><StatusIcon size={12} />{status.label}</span>
              </div>
              <div className="lf-account-meta"><span>REF <strong>{item.id.slice(0, 8).toUpperCase()}</strong></span><span>SUBMITTED <strong>{stampDate(item.createdAt)}</strong></span></div>
              <div className="lf-account-facts">
                {item.eventDate && <div><CalendarDays className="lf-account-fact-icon" size={15} /><span><small>{item.kind === "event" ? "Event date" : "Required from"}</small><strong>{item.eventDate}{item.returnDate ? " – " + item.returnDate : ""}</strong></span></div>}
                {(item.location || item.deliveryLocation) && <div><MapPin className="lf-account-fact-icon" size={15} /><span><small>{item.kind === "event" ? "Location" : "Delivery / event location"}</small><strong>{item.location || item.deliveryLocation}</strong></span></div>}
                {item.guestCount && <div><Users className="lf-account-fact-icon" size={15} /><span><small>Expected guests</small><strong>{item.guestCount.toLocaleString("en-BW")}</strong></span></div>}
                {item.deliveryRequired !== undefined && <div><Truck className="lf-account-fact-icon" size={15} /><span><small>Delivery / collection</small><strong>{item.deliveryRequired ? "Include in quote" : "Customer arranging collection"}</strong></span></div>}
                {item.servicingRequirement && <div><ShieldCheck className="lf-account-fact-icon" size={15} /><span><small>Servicing / cleaning</small><strong>{item.servicingRequirement === "yes" ? "Requested" : item.servicingRequirement === "no" ? "Not required" : "To discuss"}</strong></span></div>}
              </div>
              {(item.brief || item.notes) && <details className="lf-account-details"><summary><FileText size={13} />View request details</summary><p>{item.brief || item.notes}</p>{item.brief && item.notes && <p>{item.notes}</p>}</details>}
              <div className="lf-account-next"><strong>Current update · {status.label}</strong><p>{status.summary}</p><small>Last recorded update · {updated}</small></div>
              {item.quoteAmount !== undefined && <div className="lf-customer-quote">
                <span>QUOTE RECORDED BY LEFIFI</span><strong>{money(item.quoteAmount)}</strong>
                {item.quoteDetails && <p>{item.quoteDetails}</p>}
                <small>This is a quote only, not a payment receipt or proof of booking. Contact the team to discuss the scope.</small>
              </div>}
              <div className="lf-account-record-actions"><a href="tel:+26773706331"><Phone size={13} />Call Lefifi</a><Link href="/#request">Send another enquiry <ArrowUpRight size={13} /></Link></div>
            </article>;
          })}</div> : <div className="lf-state">
            <h2>{all.length ? "No matching requests" : "Your first request starts here"}</h2>
            <p>{all.length ? "Try another filter to see your other requests." : "Once you submit an event brief or equipment hire request, its reference, status and any recorded quote will appear here."}</p>
            <Link className="lf-primary" href="/#request">Start your first enquiry <ArrowUpRight size={15} /></Link>
          </div>}
        </>}
        <p className="lf-account-privacy"><ShieldCheck size={13} /> Your request history is private to your guest session. Use the same browser to return to these records.</p>
      </div>
    </section>

    <footer className="lf-footer"><div className="lf-container lf-footer-bottom"><span>© {new Date().getFullYear()} Lefifi Investments</span><a href="tel:+26773706331">+267 73 706 331</a></div></footer>
  </main>;
}

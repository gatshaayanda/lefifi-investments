import Link from "next/link";

export default function OfflinePage() {
  return <main className="lefifi lf-inner">
    <header className="lf-header"><div className="lf-container lf-nav"><Link className="lf-brand" href="/"><span className="lf-brand-mark">L</span><span><strong>LEFIFI</strong><small>INVESTMENTS</small></span></Link><Link className="lf-nav-account" href="/account">My requests</Link></div></header>
    <section className="lf-account-wrap"><div className="lf-container">
      <p className="lf-eyebrow">OFFLINE MODE</p><h1 className="lf-inner-title">Still here.<br/>Not everything is online.</h1>
      <div className="lf-state"><p>The Lefifi app shell and this offline information page may be available from your device cache. Cached information can be out of date.</p>
        <p>New event enquiries and equipment requests require an internet connection. If you are offline, the form will not send or queue a request. Reconnect and submit again.</p>
        <p>Request history may show records already cached on this device. Staff updates, account access and UploadThing uploads require a connection.</p>
        <p>When you reconnect, open the customer website again to refresh the latest services and request statuses.</p>
        <div className="lf-actions"><Link className="lf-primary" href="/">Return to Lefifi <span>↗</span></Link><a className="lf-secondary" href="tel:+26773706331">Call +267 73 706 331</a></div>
      </div>
    </div></section>
  </main>;
}

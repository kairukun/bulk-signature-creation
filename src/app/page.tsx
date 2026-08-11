import Link from "next/link";

const FEATURES = [
  {
    title: "Visual signature designer",
    body: "Build branded HTML signatures with layouts, colors, CTAs, logos, and live previews.",
  },
  {
    title: "Microsoft 365 directory sync",
    body: "Pull names, titles, phones, and departments from Entra ID / Graph — or explore with demo users.",
  },
  {
    title: "Targeted deployment",
    body: "Assign templates by user, department, or group and deploy organization-wide.",
  },
  {
    title: "Banner campaigns + CTR",
    body: "Schedule marketing banners in signatures and track clicks through signed tracking links.",
  },
  {
    title: "Role-based access",
    body: "IT owns deploy and directory; Marketing owns campaigns; Admin sees everything.",
  },
  {
    title: "Exchange-ready output",
    body: "Generate server-side HTML suitable for Outlook, OWA, and Exchange Online mail flow.",
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark">B</span>
          <span>
            Bulk Signature
            <small>Creation</small>
          </span>
        </div>
        <div className="landing-actions">
          <Link href="/app" className="btn btn-secondary">
            Open app
          </Link>
          <Link href="/app/signatures" className="btn btn-primary">
            Start designing
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="landing-brand" style={{ marginBottom: "1rem" }}>
            <span className="brand-mark">B</span>
            <span>
              Bulk Signature Creation
              <small>Microsoft 365 email signature manager</small>
            </span>
          </div>
          <h1>One signature system for the whole company.</h1>
          <p>
            Design once, sync from Microsoft 365, deploy by department, and run
            banner campaigns with click tracking — without asking every employee
            to update Outlook by hand.
          </p>
          <div className="landing-actions" style={{ marginTop: "1.5rem" }}>
            <Link href="/app" className="btn btn-primary">
              Launch demo workspace
            </Link>
            <Link href="/app/deploy" className="btn btn-secondary">
              See deploy flow
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <strong>Central control for Outlook &amp; Exchange</strong>
          <p style={{ margin: "0.6rem 0 0", opacity: 0.85, maxWidth: "28rem" }}>
            Templates, directory sync, role permissions, scheduled banners, and
            tracked CTAs in one Next.js workspace.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Built like BulkSignature — focused on Microsoft 365</h2>
        <p>
          This v1 combines designer, directory, campaigns, roles, and deploy so
          you can click through the full workflow before wiring production Graph
          credentials.
        </p>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="IEM Conference home">
          <span className="landing-brand-mark" aria-hidden="true">IEM</span>
          <span className="landing-brand-name">
            <strong>Institute of Engineering &amp; Management</strong>
            <small>Conference Management System</small>
          </span>
        </Link>

        <Link className="landing-sign-in landing-sign-in-header" to="/login">
          Sign in <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-eyebrow">
            <span className="landing-eyebrow-dot" />
            Ideas that bring us together
          </span>
          <h1>
            Where bright
            <br />
            minds <span>meet.</span>
          </h1>
          <p className="landing-description">
            A home for every great idea, conversation, and connection.
            Discover IEM conferences and make every moment count.
          </p>

          <div className="landing-actions">
            <Link className="landing-sign-in landing-sign-in-primary" to="/login">
              Sign in with existing account <span aria-hidden="true">→</span>
            </Link>
            <Link className="landing-create-account" to="/register">
              Create a new account <span aria-hidden="true">↗</span>
            </Link>
            <span className="landing-access-note">For participants, authors, speakers &amp; organizers</span>
          </div>

          <div className="landing-highlights" aria-label="Platform highlights">
            <div>
              <span className="landing-highlight-icon" aria-hidden="true">✦</span>
              <span><strong>One place</strong><small>for your event journey</small></span>
            </div>
            <div>
              <span className="landing-highlight-icon landing-highlight-icon-lilac" aria-hidden="true">◎</span>
              <span><strong>Every role</strong><small>part of the conversation</small></span>
            </div>
          </div>
        </div>

        <div className="landing-visual">
          <img
            className="landing-conference-image"
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=85"
            alt="A conference audience gathered beneath the lights of a modern event hall"
          />
          <div className="landing-image-shade" />
          <div className="landing-image-caption">
            <span className="landing-caption-label">THE IEM EXPERIENCE</span>
            <strong>Ideas become impact.</strong>
            <span>Connect. Collaborate. Create.</span>
          </div>
          <div className="landing-floating-card">
            <span className="landing-live-indicator" />
            <span><strong>Made for meaningful moments</strong><small>Your conference, beautifully connected</small></span>
            <span className="landing-card-sparkle" aria-hidden="true">✳</span>
          </div>
          <span className="landing-image-outline" aria-hidden="true" />
        </div>
      </section>

      <footer className="landing-footer">
        <span>INSTITUTE OF ENGINEERING &amp; MANAGEMENT</span>
        <span className="landing-footer-divider" />
        <span>Bringing knowledge into conversation</span>
      </footer>
    </main>
  );
}

import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { SearchBar, type SearchType } from "./components/SearchBar";

const navigation = [
  ["Dashboard", "/dashboard"],
  ["Conferences", "/conferences"],
  ["Sessions", "/sessions"],
  ["Registrations", "/registrations"],
  ["Payments", "/payments"],
  ["Attendance", "/attendance"],
  ["Submissions", "/submissions"],
  ["Organizer Submissions", "/organizer/submissions"],
  ["Content Management", "/content-management"],
  ["Reviews", "/reviews"],
  ["Sponsors", "/sponsors"],
  ["Exhibitors", "/exhibitors"],
  ["Resource Forecast", "/forecast"],
  ["Bottleneck Detector", "/bottlenecks"],
  ["Room Utilization", "/rooms"],
  ["Reviewer Workload", "/reviewer-workload"],
  ["Feedback", "/feedback"],
  ["Announcements", "/announcements"],
  ["Certificates", "/certificates"],
  ["Directory Search", "/search"],
] as const;

export default function Layout() {
  const navigate = useNavigate();

  const handleSearch = (query: string, type: SearchType) => {
    const parameters = new URLSearchParams({ q: query, type });
    navigate(`/search?${parameters.toString()}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brandWrap}>
          <div style={styles.brandBadge}>CMS</div>
          <div>
            <div style={styles.brand}>CMS Portal</div>
            <div style={styles.brandSub}>Conference Command</div>
          </div>
        </div>

        <nav aria-label="Main navigation" style={styles.navigation}>
          {navigation.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.activeNavLink : {}),
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button type="button" onClick={handleLogout} style={styles.logoutButton}>
          Log out
        </button>
      </aside>

      <div style={styles.contentArea}>
        <header style={styles.header}>
          <SearchBar onSearch={handleSearch} />
        </header>
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #07111f 0%, #0d172a 38%, #111827 100%)",
    color: "#e2e8f0",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    display: "flex",
    flexDirection: "column",
    padding: "24px 14px 18px",
    background: "rgba(15, 23, 42, 0.72)",
    backdropFilter: "blur(18px)",
    borderRight: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "inset -1px 0 0 rgba(148, 163, 184, 0.12)",
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 10px 22px",
  },
  brandBadge: {
    display: "grid",
    placeItems: "center",
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "linear-gradient(135deg, #60a5fa, #8b5cf6)",
    color: "#ffffff",
    fontSize: "0.8rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    boxShadow: "0 12px 20px rgba(96, 165, 250, 0.32)",
  },
  brand: {
    color: "#f8fafc",
    fontSize: "1.1rem",
    fontWeight: 800,
    letterSpacing: "0.01em",
  },
  brandSub: {
    color: "#94a3b8",
    fontSize: "0.72rem",
    marginTop: 2,
  },
  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    overflowY: "auto",
    paddingRight: 4,
  },
  navLink: {
    padding: "10px 12px",
    borderRadius: 12,
    color: "#cbd5e1",
    fontSize: "0.9rem",
    fontWeight: 600,
    textDecoration: "none",
    transition: "all 0.2s ease",
  },
  activeNavLink: {
    background: "linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(139, 92, 246, 0.17))",
    color: "#ffffff",
    boxShadow: "inset 0 0 0 1px rgba(96, 165, 250, 0.2)",
  },
  logoutButton: {
    marginTop: "auto",
    padding: "11px 14px",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.8)",
    color: "#f8fafc",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 700,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.45)",
  },
  contentArea: {
    minWidth: 0,
    flex: 1,
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0))",
  },
  header: {
    display: "flex",
    alignItems: "center",
    minHeight: 76,
    padding: "12px 28px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    background: "rgba(15, 23, 42, 0.28)",
    backdropFilter: "blur(12px)",
  },
  main: {
    minWidth: 0,
    padding: 24,
  },
};

import { useEffect, useState } from "react";
import Button from "../ui/Button.jsx";

export default function Navbar({
  overlay = false,
  scrolled = false,
  onLaunchPlanner,
  onHome,
  workspace = false,
  activeWorkspaceView = "planning",
  onNavigateWorkspace,
  theme = "dark",
  onToggleTheme,
}) {
  const [open, setOpen] = useState(false);
  const [istTime, setIstTime] = useState(() =>
    new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setIstTime(
        new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (workspace) {
    return (
      <header className="navbar navbar-solid workspace-navbar">
        <div className="noc-brand-group">
          <button className="nav-brand" type="button" onClick={onHome}>
            <span className="nav-mark" aria-hidden="true" />
            RailSync
          </button>
          <span className="noc-badge-pill" title="Network Operations Center · Ministry of Railways / CRIS / IRCTC">
            IR NOC
          </span>
        </div>

        <nav className="workspace-navigation" aria-label="Workspace navigation">
          <ul>
            <li>
              <button
                className={activeWorkspaceView === "planning" ? "active" : ""}
                type="button"
                aria-current={activeWorkspaceView === "planning" ? "page" : undefined}
                onClick={() => onNavigateWorkspace?.("planning")}
              >
                Planning
              </button>
            </li>
            <li>
              <button
                className={activeWorkspaceView === "analysis" ? "active" : ""}
                type="button"
                aria-current={activeWorkspaceView === "analysis" ? "page" : undefined}
                onClick={() => onNavigateWorkspace?.("analysis")}
              >
                Analysis
              </button>
            </li>
            <li>
              <button
                type="button"
                className={activeWorkspaceView === "scenario" ? "active" : ""}
                aria-current={activeWorkspaceView === "scenario" ? "page" : undefined}
                onClick={() => onNavigateWorkspace?.("scenario")}
              >
                Scenario Lab
              </button>
            </li>
          </ul>
        </nav>

        <div className="noc-telemetry-cluster">
          <div className="noc-clock" title="Indian Standard Time (IST)">
            <span className="noc-pulse-dot" aria-hidden="true" />
            <span>IST {istTime}</span>
          </div>
          <div className="noc-engine-indicator" title="Google OR-Tools CP-SAT Solver v9.15">
            <span style={{ color: "#10b981" }}>●</span> CP-SAT OPTIMAL
          </div>
          <button
            type="button"
            className="noc-theme-toggle"
            onClick={onToggleTheme}
            title="Toggle NOC Tactical Dark / Operational Day Mode"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️ DAY" : "🌙 NOC"}
          </button>
          <Button variant="ghost" onClick={onHome} className="workspace-home-button">
            Back to Home
          </Button>
        </div>
      </header>
    );
  }

  const goHomeSection = (id) => (event) => {
    event.preventDefault();
    setOpen(false);

    if (!overlay) {
      window.location.hash = id;
      onHome?.();
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const classes = [
    "navbar",
    overlay ? "navbar-overlay" : "navbar-solid",
    scrolled ? "scrolled" : "",
    open ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className="noc-brand-group">
        <button className="nav-brand" type="button" onClick={onHome}>
          <span className="nav-mark" aria-hidden="true" />
          RailSync
        </button>
        <span className="noc-badge-pill" title="Network Operations Center · Ministry of Railways / CRIS / IRCTC">
          IR NOC
        </span>
      </div>

      <div className={`nav-panel ${open ? "open" : ""}`}>
        <ul className="nav-links">
          <li>
            <a href="#solution" onClick={goHomeSection("solution")}>
              Solution
            </a>
          </li>
          <li>
            <a href="#how-it-works" onClick={goHomeSection("how-it-works")}>
              How It Works
            </a>
          </li>
          <li>
            <a href="#impact" onClick={goHomeSection("impact")}>
              Impact
            </a>
          </li>
          <li>
            <button
              className="link"
              type="button"
              onClick={() => {
                setOpen(false);
                onLaunchPlanner();
              }}
            >
              Planner
            </button>
          </li>
        </ul>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="noc-theme-toggle"
            onClick={onToggleTheme}
            title="Toggle NOC Tactical Dark / Operational Day Mode"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️ DAY" : "🌙 NOC"}
          </button>
          <Button
            onClick={() => {
              setOpen(false);
              onLaunchPlanner();
            }}
          >
            Launch Planner
          </Button>
        </div>
      </div>

      <button
        className="nav-toggle"
        type="button"
        aria-label="Menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}

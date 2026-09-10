import { useEffect, useState } from "react";
import AnalysisPage from "./pages/AnalysisPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PlanningWorkspace from "./pages/PlanningWorkspace.jsx";
import ScenarioLab from "./pages/ScenarioLab.jsx";

function App() {
  const [view, setView] = useState("landing");
  const [workspaceView, setWorkspaceView] = useState("planning");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("railsync-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("railsync-theme", theme);
    } catch (e) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const [planningSession, setPlanningSession] = useState({
    territoryId: "saktigarh_memari_public_demo",
    territory: null,
    tasks: [],
    trains: [],
    plan: null,
    dataError: null,
    optimizationError: null,
    recovery: null,
    riskConfig: { mode: "STATIC", target: "", profile: "" },
  });

  if (view === "workspace") {
    if (workspaceView === "scenario") {
      return (
        <ScenarioLab
          session={planningSession}
          setSession={setPlanningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    }
    if (workspaceView === "analysis") {
      return (
        <AnalysisPage
          session={planningSession}
          onNavigate={setWorkspaceView}
          onHome={() => setView("landing")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    }
    return (
      <PlanningWorkspace
        session={planningSession}
        setSession={setPlanningSession}
        onNavigate={setWorkspaceView}
        onHome={() => setView("landing")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <LandingPage
      initialTerritoryId={planningSession.territoryId}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLaunchPlanner={(territoryId = planningSession.territoryId) => {
        if (territoryId !== planningSession.territoryId) {
          setPlanningSession((current) => ({
            ...current,
            territoryId,
            territory: null,
            tasks: [],
            trains: [],
            plan: null,
            recovery: null,
            dataError: null,
            optimizationError: null,
          }));
        }
        setWorkspaceView("planning");
        setView("workspace");
      }}
    />
  );
}

export default App;

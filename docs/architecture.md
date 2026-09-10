# System Architecture · RailSync

RailSync is architected as a high-performance, containerized, multi-tier system engineered for the demanding real-time requirements of railway operations centers.

---

## High-Level Data Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│             Section Controller / Chief Controller (NOC)               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   React 18 + Vite Operations Dashboard                 │
│  - Tactical Dark NOC Theme                                             │
│  - Interactive SVG Time-Distance String Diagram                        │
│  - Live IST Operations Clock & Telemetry Heartbeat                     │
│  - Operational Lifecycle Controls (DRAFT -> FROZEN -> IN PROGRESS)     │
│  - RailSync Copilot Dialogue Panel                                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / REST JSON
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express & FastAPI Gateway Tier                      │
│  - Fast Pydantic request validation                                    │
│  - Session state, freeze locks, and territory persistence             │
│  - Telemetry generation & data harmonization                           │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│     Google OR-Tools CP-SAT Kernel    │  │   LightGBM / Scikit-Learn    │
│  - Decision variable formulation     │  │   Predictive Risk Engine     │
│  - 25 kV AC OHE power block logic    │  │  - Weather & congestion risk │
│  - Headway safety constraints        │  │  - Overrun probability calc  │
│  - Multi-objective cost minimization │  │  - Historical PWI delay logs │
│  - Sub-second minimal-change recovery│  │                              │
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Data & Provenance Tier                          │
│  - Canonical Indian Railways Corridor Network (ER, WR, NR)             │
│  - Working Timetables (WTT) & Sectional Line Occupancies               │
│  - Civil / Electrical / S&T Maintenance Demand Work Orders             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Operations UI (Frontend)
- **Framework**: React 18, Vite, modern CSS custom properties.
- **Visuals**: Specialized tactical NOC dark palette with JetBrains Mono telemetry typography.
- **Time-Distance String Diagram**: Pure SVG vector renderer computing real-time train paths, station distances, block overlays, and safety headway corridors.

### 2. Optimization Engine (Backend)
- **Solver**: Google OR-Tools CP-SAT (Constraint Programming - Satisfiability).
- **Hard Constraints**:
  - Headway separation buffer (15 minutes before/after train arrival).
  - 25 kV AC OHE power block isolation envelopes.
  - Crew and specialized heavy machine availability (cumulative resource limits).
- **Objective Function**: Minimizes corridor track possession time, penalizes task tardiness, and rewards inter-departmental co-location.

### 3. Operational Recovery Engine (Scenario Lab)
- Handles dynamic train delays, crew cancellations, and emergency rail fractures.
- Executes minimal perturbation re-optimization preserving `FROZEN` and `IN_PROGRESS` blocks while shifting flexible tasks into viable timetable gaps in $< 850$ milliseconds.

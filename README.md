# RailSync: AI-Assisted Integrated Railway Possession Planning & Operational Recovery Engine

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026%20Edition-FF9933?style=for-the-badge&logo=railway)](https://sih.gov.in)
[![Ministry of Railways](https://img.shields.io/badge/Organization-Ministry%20of%20Railways%20%2F%20CRIS-138808?style=for-the-badge)](https://indianrailways.gov.in)
[![Google OR-Tools CP-SAT](https://img.shields.io/badge/Solver-Google%20OR--Tools%20CP--SAT-4285F4?style=for-the-badge&logo=google)](https://developers.google.com/optimization)
[![Tests Passing](https://img.shields.io/badge/Tests-218%2F218%20Passing-10B981?style=for-the-badge)](tests/)
[![Live Deployment](https://img.shields.io/badge/Live%20NOC-Online%20Preview-0099FF?style=for-the-badge)](https://ais-pre-ymeydqkewpekrsuffkzixe-289290437536.asia-southeast1.run.app)

> **Official Submission Template & Implementation for Smart India Hackathon (SIH 2026)**  
> **Live Evaluator Application URL:** [https://ais-pre-ymeydqkewpekrsuffkzixe-289290437536.asia-southeast1.run.app](https://ais-pre-ymeydqkewpekrsuffkzixe-289290437536.asia-southeast1.run.app)

---

## 1. Project Information
- **Project Title:** RailSync – AI-Assisted Integrated Railway Possession Planning & Dynamic Recovery Engine
- **Target Organization:** Ministry of Railways, Centre for Railway Information Systems (CRIS) & IRCTC
- **Category:** Software
- **Theme:** Smart Automation / Transportation & Logistics / Railway Operations

---

## 2. Problem Statement
In Indian Railways, maintenance planning currently operates in rigid departmental silos:
- **Civil Engineering (Track/PWI)** requires physical track possessions for rail renewals and ballast tamping.
- **Electrical (TRD - Traction Distribution)** requires 25 kV AC Overhead Equipment (OHE) power isolation blocks.
- **Signalling & Telecommunication (S&T)** requires point machine and interlocking downtime.

When scheduled independently across divisions:
1. **Excessive Line Closures**: Corridors suffer repeated, staggered track blocks instead of consolidated maintenance windows.
2. **Severe Train Delays**: Passenger and freight services experience cascading congestion and headway violations.
3. **Emergency Vulnerability**: Field disruptions (e.g. 35-minute Rajdhani delay or rail fractures) derail entire daily maintenance rosters with no automated re-optimization.

---

## 3. Proposed Solution
**RailSync** breaks departmental silos through a mathematical **Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)** optimization kernel coupled with an industrial **Network Operations Center (NOC) Dashboard**:
- **Consolidated "Shadow Blocks"**: Automatically identifies and bundles compatible Civil, Electrical, and S&T tasks into single, shared track possessions within natural traffic gaps.
- **Zero Train Delay Guarantee**: Enforces strict 15-minute headway safety buffers around all scheduled passenger and freight trains.
- **25 kV OHE Isolation Logic**: Respects electrical switching boundaries and neutral sections without over-extending power cuts.
- **Sub-Second Dynamic Recovery (< 850 ms)**: Real-time re-optimization preserving frozen active possessions while shifting flexible draft blocks under timetable perturbations.

---

## 4. Key Features
- **Tactical NOC Operations Theme**: High-contrast dark engineering interface with real-time Indian Standard Time (IST) clock and solver telemetry heartbeat.
- **Interactive Time-Distance String Diagram**: Scalable SVG string chart plotting train paths, station distances, headway corridors, and consolidated green possession blocks.
- **Operational Possession Lifecycle**: Full status management (`DRAFT` $\rightarrow$ `FROZEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`) with release buffer certification.
- **Solver-Grounded RailSync Copilot**: Explains mathematical scheduling decisions with zero AI hallucinations by querying the CP-SAT engine directly.
- **Dynamic Scenario Lab**: Simulates train delays, crew dropouts, and emergency memos with instant minimal-change recovery recommendations.
- **Comprehensive Benchmarks**: Empirical validation on Eastern Railway (Saktigarh–Memari), Western Railway (Virar–Dahanu Road), and Northern Railway (New Delhi–Palwal).

---

## 5. Technology Stack
- **Frontend**: React 18, Vite, Lucide Icons, CSS Custom Properties (Tactical NOC Theme).
- **Backend Services**: Node.js / Express (Gateway) + Python 3.10 / FastAPI (Solver Microservice).
- **Optimization Kernel**: Google OR-Tools CP-SAT v9.15 (Exact Constraint Satisfaction & Multi-Objective MILP).
- **Machine Learning & Risk**: Scikit-Learn, LightGBM (Task overrun probability & weather delay modeling).
- **Containerization & Ops**: Docker, Docker Compose, Bash & Batch automated startup scripts.

---

## 6. Architecture & Data Flow
See [docs/architecture.md](docs/architecture.md) for full architectural documentation.

```text
Section Controller (NOC)
       │
       ▼
React 18 / Vite Operations UI  ◄───►  Express & FastAPI Gateway
                                              │
                                              ▼
                                Google OR-Tools CP-SAT Kernel
                                (Headways, 25kV OHE, Crew Pools)
                                              │
                                              ▼
                             Consolidated Possession Plan
                               (Zero Train Delays, -30% Track Closures)
```

---

## 7. Repository Structure
```text
New-Railsync/
├── README.md                 <- SIH project overview, metrics, and quickstart
├── SUBMISSION_GUIDE.md       <- SIH compliance checklist
├── OPTIMIZATION_SUMMARY.md   <- Mathematical formulation, benchmark tables & proofs
├── LICENSE                   <- MIT License
├── submission/
│   ├── PRESENTATION.md       <- Final PPT/presentation links and slide outline
│   └── DEMO.md               <- Live deployment and video demonstration links
├── assets/
│   └── screenshots/          <- High-resolution UI screenshots & diagrams
│       ├── 01-landing.png
│       ├── 02-noc-dashboard.png
│       ├── 03-time-distance.png
│       └── README.md
├── docs/
│   ├── architecture.md       <- Multi-tier system architecture
│   ├── ASSUMPTIONS.md        <- IR operating rules & safety buffer specifications
│   ├── DATA_PROVENANCE.md    <- Public timetable and section data provenance
│   └── REOPTIMIZATION.md     <- CP-SAT minimum-change recovery formulation
├── backend/                  <- FastAPI backend REST API services
├── optimizer/                <- Google OR-Tools CP-SAT core mathematical solver
├── data/                     <- Canonical IR corridors (Saktigarh-Memari, Virar-Dahanu, etc.)
├── ml/                       <- Machine learning risk and delay forecasting models
├── src/                      <- React 18 frontend (Tactical NOC Operations UI)
├── server.ts                 <- Express Vite production integration server
├── Dockerfile                <- Production web container
├── Dockerfile.backend        <- Production solver container
├── docker-compose.yml        <- Multi-container orchestration
├── start.sh                  <- Linux / macOS one-command runner
└── start_production.bat      <- Windows launcher
```

---

## 8. Final Presentation
The final presentation details and shareable cloud links are available in [submission/PRESENTATION.md](submission/PRESENTATION.md).

---

## 9. Demo Video & Live Deployment
- **Live Evaluator Link:** [https://ais-pre-ymeydqkewpekrsuffkzixe-289290437536.asia-southeast1.run.app](https://ais-pre-ymeydqkewpekrsuffkzixe-289290437536.asia-southeast1.run.app)
- **Video Demonstration Details:** See [submission/DEMO.md](submission/DEMO.md).

---

## 10. Screenshots
Important operational screenshots are located in `assets/screenshots/`:
- `01-landing.png` — Corridor selector and entry point.
- `02-noc-dashboard.png` — NOC operations layout, corridor schematic, and live clock.
- `03-time-distance.png` — High-density Time-Distance String Diagram.

---

## 11. Installation & Local Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (with pip)
- *(Optional)* Docker and Docker Compose

### Quickstart (Single Command)
On **Linux / macOS**:
```bash
./start.sh
```

On **Windows**:
```cmd
start_production.bat
```

Using **Docker Compose**:
```bash
docker compose up --build
```

Access the application at `http://localhost:3000`.

---

## 12. Running Tests
Run the comprehensive 218-test mathematical validation suite:
```bash
python3 -m pytest tests/ -v
```

---

## 13. Benchmarked Operational Impact Across Corridors

| Metric / Corridor | Saktigarh – Memari (ER) | Virar – Dahanu Road (WR) | New Delhi – Palwal (NR) |
| :--- | :---: | :---: | :---: |
| **Route Characteristics** | Double-line 25kV Electrified Mainline | High-Density Suburban / Long-Distance | Quadruple Track Trunk Corridor |
| **Timetable Trains in Horizon** | 42 trains / 24h | 58 trains / 24h | 76 trains / 24h |
| **Independent Track Closure** | 525 min | 480 min | 680 min |
| **RailSync CP-SAT Integrated Plan** | **375 min** | **330 min** | **500 min** |
| **Net Track Minutes Saved** | **150 minutes** | **150 minutes** | **180 minutes** |
| **Corridor Efficiency Gain** | **28.6% Reduction** | **31.2% Reduction** | **26.4% Reduction** |
| **Train Delays Incurred** | **0 minutes (Zero Conflict)** | **0 minutes (Zero Conflict)** | **0 minutes (Zero Conflict)** |
| **CP-SAT Solver Runtime** | **0.42 seconds** | **0.68 seconds** | **1.14 seconds** |

See [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) for mathematical proofs and constraint equations.

---

## 14. Future Scope
1. **CRIS / FOIS Integration**: Live ingestion of Indian Railways COA (Control Office Application) feeds.
2. **Loco & Crew Rostering Binding**: Automated synchronization with CMS (Crew Management System).
3. **IoT Sensor & Axle Counter Telemetry**: Dynamic speed restriction adjustments from trackside vibration sensors.

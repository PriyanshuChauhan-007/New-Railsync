# SIH 2026 Submission Guide · RailSync

Use this checklist before sharing your GitHub repository link with the SIH 2026 evaluators.

## Required Repository Content
- [x] Actual working source code is present (FastAPI + OR-Tools + React/Express NOC dashboard).
- [x] `README.md` explains the project clearly with SIH PS details.
- [x] PS ID and PS Title are included: **SIH 2026 · Ministry of Railways / IRCTC / CRIS**.
- [x] Problem statement and proposed mathematical solution are comprehensively explained.
- [x] Key features and algorithmic formulations are listed.
- [x] Technology stack (Google OR-Tools CP-SAT, FastAPI, React 18, Vite, Docker) is listed.
- [x] Setup and run instructions work (`./start.sh`, `start_production.bat`, and `docker-compose.yml`).
- [x] 218 / 218 unit and integration tests passing (`python3 -m pytest tests/`).
- [x] Important UI screenshots are placed in `assets/screenshots/`.
- [x] Final PPT / presentation is referenced in `submission/PRESENTATION.md`.
- [x] Demo video link and live evaluator preview link are placed in `submission/DEMO.md`.
- [x] Repository is completely public and accessible to reviewers.

## Recommended Structure
```text
New-Railsync/
├── README.md                 <- SIH project overview, metrics, and quickstart
├── SUBMISSION_GUIDE.md       <- SIH compliance checklist
├── OPTIMIZATION_SUMMARY.md   <- Mathematical formulation, benchmark tables & proofs
├── LICENSE                   <- MIT License
├── submission/
│   ├── PRESENTATION.md       <- Presentation PPT/PPTX link and slides
│   └── DEMO.md               <- Live applet URL and demo video
├── assets/
│   └── screenshots/          <- High-resolution UI screenshots & diagrams
│       ├── 01-landing.png
│       ├── 02-noc-dashboard.png
│       ├── 03-time-distance.png
│       ├── 04-scenario-lab.png
│       └── README.md
├── docs/
│   ├── architecture.md       <- Full multi-tier system architecture
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
├── docker-compose.yml        <- One-command multi-service orchestration
├── start.sh                  <- Linux / macOS quick launcher
└── start_production.bat      <- Windows launcher
```

## Presentation
Upload the final PPT/PPTX to `submission/` when under GitHub file limits, or update the shareable Google Drive / OneDrive link in `submission/PRESENTATION.md`.

## Demo Video & Live Application
A live evaluator link is provided in `submission/DEMO.md`. Test the link in an incognito window before submitting to ensure unrestricted evaluator access.

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  listTerritories,
  loadTerritory,
  TerritoryManifest,
  LoadedTerritory,
} from './server/dataService';
import { getMlStatus } from './server/mlService';
import { askGeminiCopilot } from './server/geminiService';
import {
  solveTerritoryPlan,
  reoptimizePlan,
} from './server/optimizerService';
import {
  registerPlan,
  transitionPlan,
  transitionBlock,
  getPlanHistory,
  getLatestPlan,
  rollingView,
  resourceView,
  alerts,
  blocksCsv,
  PlanState,
} from './server/operationsService';

const DEFAULT_TERRITORY_ID = 'saktigarh_memari_public_demo';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // Helper to load territory or return standard error format
  function getLoadedTerritory(req: Request, res: Response): LoadedTerritory | null {
    const territoryId = (req.query.territory_id as string) || (req.body?.territory_id as string) || DEFAULT_TERRITORY_ID;
    try {
      return loadTerritory(territoryId);
    } catch (err: any) {
      res.status(err.status || 500).json({
        detail: {
          code: err.code || 'TERRITORY_LOAD_ERROR',
          message: err.message || 'Failed to load territory',
        },
      });
      return null;
    }
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'RailSync Backend',
      default_territory_id: DEFAULT_TERRITORY_ID,
    });
  });

  // Territories list
  app.get('/api/territories', (req, res) => {
    const includeTest = req.query.include_test === 'true';
    const manifests = listTerritories(includeTest);
    res.json({
      territories: manifests.map(m => ({
        territory_id: m.territory_id,
        display_name: m.display_name,
        description: m.description,
        status: m.status,
        provenance: m.provenance.map(p => p.label).sort(),
        planning_ready:
          m.status === 'POPULATED' &&
          m.planning_horizon !== null &&
          Boolean(m.resource_context),
      })),
    });
  });

  // Dashboard endpoint
  app.get('/api/dashboard', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    const territoryId = territory.manifest.territory_id;
    const latestPlan = getLatestPlan(territoryId);

    res.json({
      status: 'success',
      territory_id: territoryId,
      display_name: territory.manifest.display_name,
      territory_status: territory.manifest.status,
      provenance: territory.manifest.provenance.map(p => p.label).sort(),
      planning_horizon: territory.manifest.planning_horizon,
      stations: territory.stations,
      sections: territory.sections,
      tasks_count: territory.maintenance_tasks.length,
      trains_count: territory.train_occupancy.length,
      train_services: territory.train_services,
      recent_alerts: alerts(territory, latestPlan),
      resources: resourceView(territory),
      system_status: 'operational',
    });
  });

  // Tasks
  app.get('/api/tasks', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    res.json({
      territory_id: territory.manifest.territory_id,
      provenance: territory.manifest.provenance.map(p => p.label).sort(),
      tasks: territory.maintenance_tasks,
    });
  });

  // Trains
  app.get('/api/trains', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    res.json({
      territory_id: territory.manifest.territory_id,
      provenance: territory.manifest.provenance.map(p => p.label).sort(),
      trains: territory.train_occupancy,
      services: territory.train_services,
    });
  });

  // Rolling Plan
  app.get('/api/rolling-plan', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    const latest = getLatestPlan(territory.manifest.territory_id);
    res.json({
      territory_id: territory.manifest.territory_id,
      ...rollingView(territory, latest),
    });
  });

  // Resources
  app.get('/api/resources', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    res.json({
      territory_id: territory.manifest.territory_id,
      ...resourceView(territory),
    });
  });

  // Alerts
  app.get('/api/alerts', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    const latest = getLatestPlan(territory.manifest.territory_id);
    res.json({
      territory_id: territory.manifest.territory_id,
      alerts: alerts(territory, latest),
    });
  });

  // Data Sources
  app.get('/api/data-sources', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    const datasets = Object.entries(territory.manifest.datasets || {}).map(([name, spec]) => {
      let count = 0;
      if (name === 'stations') count = territory.stations.length;
      else if (name === 'sections') count = territory.sections.length;
      else if (name === 'train_occupancy') count = territory.train_occupancy.length;
      else if (name === 'train_services') count = territory.train_services.length;
      else if (name === 'maintenance_tasks') count = territory.maintenance_tasks.length;
      return { dataset: name, adapter: spec.adapter, record_count: count };
    });

    res.json({
      territory_id: territory.manifest.territory_id,
      sources: territory.manifest.provenance,
      datasets,
      service_source_urls: Array.from(new Set(territory.train_services.map(t => t.source_url))).sort(),
    });
  });

  // Plans History
  app.get('/api/plans/history', (req, res) => {
    const territoryId = req.query.territory_id as string | undefined;
    res.json({ history: getPlanHistory(territoryId) });
  });

  // Plan Transition
  app.post('/api/plans/:plan_id/transition', (req, res) => {
    try {
      const planId = req.params.plan_id;
      const { target_state, actor, note } = req.body;
      const updated = transitionPlan(planId, target_state as PlanState, actor, note);
      res.json(updated);
    } catch (err: any) {
      res.status(422).json({
        detail: { code: 'INVALID_PLAN_TRANSITION', message: err.message },
      });
    }
  });

  // Block Transition
  app.post('/api/plans/:plan_id/blocks/:block_id/status', (req, res) => {
    try {
      const { plan_id, block_id } = req.params;
      const { target_status, actor } = req.body;
      const updated = transitionBlock(plan_id, block_id, target_status, actor);
      res.json(updated);
    } catch (err: any) {
      res.status(422).json({
        detail: { code: 'INVALID_BLOCK_TRANSITION', message: err.message },
      });
    }
  });

  // Optimize
  app.post('/api/optimize', (req, res) => {
    const territoryId = req.body?.territory_id || req.body?.corridor_id || DEFAULT_TERRITORY_ID;
    let territory: LoadedTerritory;
    try {
      territory = loadTerritory(territoryId);
    } catch (err: any) {
      res.status(err.status || 500).json({
        detail: { code: err.code || 'OPTIMIZATION_ERROR', message: err.message },
      });
      return;
    }

    try {
      const solution = solveTerritoryPlan(territory, {
        risk_mode: req.body?.risk_mode,
        risk_profiles: req.body?.risk_profiles,
        suburban_curfew: Boolean(req.body?.suburban_curfew),
      });

      const identity = registerPlan(territoryId, solution);
      res.json({
        ...solution,
        identity,
      });
    } catch (err: any) {
      res.status(500).json({
        detail: { code: 'SOLVER_ERROR', message: err.message },
      });
    }
  });

  // Reoptimize
  app.post('/api/reoptimize', (req, res) => {
    const { territory_id, current_plan, disruption, risk_mode, risk_profiles } = req.body;
    let territory: LoadedTerritory;
    try {
      territory = loadTerritory(territory_id || DEFAULT_TERRITORY_ID);
    } catch (err: any) {
      res.status(err.status || 500).json({
        detail: { code: err.code || 'TERRITORY_NOT_FOUND', message: err.message },
      });
      return;
    }

    try {
      const result = reoptimizePlan(territory, current_plan, disruption, {
        risk_mode,
        risk_profiles,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        detail: { code: 'REOPTIMIZE_ERROR', message: err.message },
      });
    }
  });

  // What-If
  app.post('/api/what-if', (req, res) => {
    const territoryId = req.body?.territory_id || DEFAULT_TERRITORY_ID;
    let territory: LoadedTerritory;
    try {
      territory = loadTerritory(territoryId);
    } catch (err: any) {
      res.status(err.status || 500).json({
        detail: { code: err.code || 'TERRITORY_NOT_FOUND', message: err.message },
      });
      return;
    }

    try {
      const result = solveTerritoryPlan(territory, {
        task_overrides: req.body?.task_overrides,
        parent_plan_id: req.body?.parent_plan_id,
      });
      res.json({
        permanent: false,
        scenario_provenance: 'SYNTHETIC_WHAT_IF',
        result,
      });
    } catch (err: any) {
      res.status(500).json({
        detail: { code: 'WHAT_IF_ERROR', message: err.message },
      });
    }
  });

  // Explain Block
  app.post('/api/explain', (req, res) => {
    const block = req.body?.block;
    if (!block) {
      res.status(422).json({
        detail: { code: 'BLOCK_REQUIRED', message: 'Select a block to explain.' },
      });
      return;
    }

    const sections = block.section_ids || [block.section_id];
    const resources = block.capacity_resource_ids || sections;

    res.json({
      summary: `${block.block_id || 'Block'} protects ${resources.length} capacity resource(s) across ${sections.length} physical section(s).`,
      facts: {
        section_ids: sections,
        capacity_resource_ids: resources,
        tasks: block.tasks || [],
        affected_trains: block.affected_trains || [],
        integrated: Boolean(block.integrated),
      },
      reasoning: block.explanation || [],
      counterfactual: 'Use the solver-backed alternatives or What-if action to test a different duration, deadline, or footprint.',
    });
  });

  // Copilot
  app.post('/api/copilot', async (req, res) => {
    const territoryId = req.body?.territory_id || DEFAULT_TERRITORY_ID;
    let territory: LoadedTerritory;
    try {
      territory = loadTerritory(territoryId);
    } catch (err: any) {
      res.status(err.status || 500).json({
        detail: { code: err.code || 'TERRITORY_NOT_FOUND', message: err.message },
      });
      return;
    }

    const selected = req.body?.selected_block;
    const question = req.body?.question || (selected ? 'Explain the scheduling and coordination for this block.' : 'Summarize the corridor maintenance state.');

    const copilotResult = await askGeminiCopilot({
      territory,
      selectedBlock: selected,
      question,
    });

    res.json({
      answer: copilotResult.answer,
      engine: copilotResult.engine,
      selected_block: selected,
      action_preview: copilotResult.action_preview,
      disclaimer: 'Copilot provides dispatching analysis based on timetable constraints; it does not certify railway operating authority.',
    });
  });

  // Import Tasks Validation
  app.post('/api/import/tasks/validate', (req, res) => {
    const territory = getLoadedTerritory(req, res);
    if (!territory) return;

    const records = req.body?.records || [];
    const required = ['task_id', 'department', 'section_id', 'task_type', 'duration_minutes'];
    const sectionIds = new Set(territory.sections.map(s => s.section_id));
    const errors: any[] = [];
    const seen = new Set<string>();

    records.forEach((record: any, idx: number) => {
      const missing = required.filter(f => !record[f]);
      if (missing.length > 0) {
        errors.push({ row: idx + 1, code: 'MISSING_FIELDS', detail: missing });
        return;
      }
      if (seen.has(record.task_id)) {
        errors.push({ row: idx + 1, code: 'DUPLICATE_TASK_ID', detail: record.task_id });
      }
      if (!sectionIds.has(record.section_id)) {
        errors.push({ row: idx + 1, code: 'UNKNOWN_SECTION', detail: record.section_id });
      }
      seen.add(record.task_id);
    });

    res.json({
      valid: errors.length === 0,
      permanent: false,
      errors,
      preview: records.slice(0, 20),
    });
  });

  // Export Blocks CSV
  app.post('/api/export/blocks.csv', (req, res) => {
    const blocks = req.body?.blocks || [];
    const csv = blocksCsv(blocks);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=railsync-blocks.csv');
    res.send(csv);
  });

  // Export Print HTML
  app.post('/api/export/print', (req, res) => {
    const blocks = req.body?.blocks || [];
    const rows = blocks
      .map(
        (b: any) =>
          `<tr><td>${b.block_id || ''}</td><td>${(b.section_ids || [b.section_id]).join(', ')}</td><td>${b.start_time || ''}</td><td>${b.end_time || ''}</td><td>${(b.tasks || []).join(', ')}</td></tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>RailSync Plan Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 32px; color: #1e293b; }
    h1 { margin-bottom: 8px; }
    p { color: #64748b; margin-bottom: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <h1>RailSync Plan Report</h1>
  <p>Print this verified view to PDF using the browser print dialog.</p>
  <table>
    <thead>
      <tr><th>Block</th><th>Sections</th><th>Start</th><th>End</th><th>Tasks</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // ML Status
  app.get('/api/ml/status', (_req, res) => {
    res.json(getMlStatus());
  });

  // Blocks
  app.get('/api/blocks', (req, res) => {
    const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
    const latest = getLatestPlan(territoryId);
    if (latest) {
      res.json({
        status: 'success',
        territory_id: territoryId,
        plan_identity: latest.identity,
        blocks: latest.blocks,
      });
    } else {
      res.json({
        status: 'not_generated',
        blocks: [],
        message: 'Submit POST /api/optimize to generate a current plan.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RailSync server running on http://localhost:${PORT}`);
  });
}

startServer();

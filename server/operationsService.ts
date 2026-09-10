import { LoadedTerritory, MaintenanceTask } from './dataService';

export const PLAN_STATES = ['DRAFT', 'REVIEWED', 'APPROVED', 'PUBLISHED'] as const;
export type PlanState = typeof PLAN_STATES[number];

export const BLOCK_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['FROZEN', 'CANCELLED'],
  FROZEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface PlanIdentity {
  plan_id: string;
  version: number;
  state: PlanState;
  created_at: string;
  parent_plan_id: string | null;
}

export interface PlanRecord {
  identity: PlanIdentity;
  territory_id: string;
  blocks: any[];
  unscheduled_tasks: string[];
  metrics: any;
  events: Array<{
    state?: string;
    block_id?: string;
    status?: string;
    at: string;
    actor: string;
    note?: string;
  }>;
}

const plans: Map<string, PlanRecord> = new Map();
const territoryVersions: Map<string, number> = new Map();

export function registerPlan(territoryId: string, payload: any, parentPlanId: string | null = null): PlanIdentity {
  const version = (territoryVersions.get(territoryId) || 0) + 1;
  territoryVersions.set(territoryId, version);
  const planId = `${territoryId}-v${version}`;
  const identity: PlanIdentity = {
    plan_id: planId,
    version,
    state: 'DRAFT',
    created_at: new Date().toISOString(),
    parent_plan_id: parentPlanId,
  };

  plans.set(planId, {
    identity,
    territory_id: territoryId,
    blocks: JSON.parse(JSON.stringify(payload.blocks || [])),
    unscheduled_tasks: [...(payload.unscheduled_tasks || [])],
    metrics: JSON.parse(JSON.stringify(payload.metrics || {})),
    events: [{ state: 'DRAFT', at: identity.created_at, actor: 'planner' }],
  });

  return identity;
}

export function transitionPlan(planId: string, targetState: PlanState, actor = 'planner', note = ''): PlanRecord {
  const plan = plans.get(planId);
  if (!plan) throw new Error(`Unknown plan ID: ${planId}`);
  if (!PLAN_STATES.includes(targetState)) throw new Error(`Unknown plan state: ${targetState}`);

  const currentIndex = PLAN_STATES.indexOf(plan.identity.state);
  const targetIndex = PLAN_STATES.indexOf(targetState);
  if (targetIndex !== currentIndex + 1) {
    throw new Error(`Plan transition must advance one step from ${plan.identity.state}.`);
  }

  const timestamp = new Date().toISOString();
  plan.identity.state = targetState;
  plan.events.push({ state: targetState, at: timestamp, actor, note });
  return JSON.parse(JSON.stringify(plan));
}

export function transitionBlock(planId: string, blockId: string, targetStatus: string, actor = 'planner'): any {
  const plan = plans.get(planId);
  if (!plan) throw new Error(`Unknown plan ID: ${planId}`);
  const block = plan.blocks.find(b => b.block_id === blockId);
  if (!block) throw new Error(`Unknown block ID: ${blockId}`);

  const current = block.status || 'DRAFT';
  const allowed = BLOCK_TRANSITIONS[current] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(`Block transition ${current} → ${targetStatus} is not allowed.`);
  }

  block.status = targetStatus;
  plan.events.push({
    block_id: blockId,
    status: targetStatus,
    at: new Date().toISOString(),
    actor,
  });

  return JSON.parse(JSON.stringify(block));
}

export function getPlanHistory(territoryId?: string): PlanRecord[] {
  const list: PlanRecord[] = [];
  for (const record of plans.values()) {
    if (!territoryId || record.territory_id === territoryId) {
      list.push(JSON.parse(JSON.stringify(record)));
    }
  }
  return list.sort((a, b) => b.identity.created_at.localeCompare(a.identity.created_at));
}

export function getLatestPlan(territoryId: string): PlanRecord | null {
  const hist = getPlanHistory(territoryId);
  return hist.length > 0 ? hist[0] : null;
}

export function rollingView(territory: LoadedTerritory, plan?: PlanRecord | null) {
  const tasks = territory.maintenance_tasks;
  const blocks = plan?.blocks || [];
  const scheduled = new Set<string>();
  for (const b of blocks) {
    for (const t of b.tasks || []) scheduled.add(t);
  }

  const departments = Array.from(new Set(tasks.map(t => t.department))).sort();
  const horizonStart = territory.manifest.planning_horizon?.start_time || '2026-09-01T00:00:00';

  const month = [
    {
      period: horizonStart.slice(0, 7),
      demand_count: tasks.length,
      critical_demand_count: tasks.filter(t => t.criticality >= 9).length,
      departments,
      planning_state: 'DEMAND_REVIEW',
    },
  ];

  const week = [
    {
      period: 'operating-week',
      candidate_task_ids: tasks.map(t => t.task_id),
      resource_pools: territory.resource_context ? Object.keys(territory.resource_context.crew_capacities).sort() : [],
      planning_state: 'COORDINATION',
    },
  ];

  const day = [
    {
      date: horizonStart.slice(0, 10),
      scheduled_task_ids: Array.from(scheduled).sort(),
      unscheduled_task_ids: tasks.filter(t => !scheduled.has(t.task_id)).map(t => t.task_id).sort(),
      blocks,
      planning_state: plan ? 'SOLVER_PLAN' : 'READY_TO_SOLVE',
    },
  ];

  return { monthly: month, weekly: week, day_of: day };
}

export function resourceView(territory: LoadedTerritory) {
  const context = territory.resource_context;
  if (!context) {
    return { provenance: null, crew: [], machines: [], power_windows: {} };
  }

  const rows = (capacities: Record<string, number>, windows: Record<string, any[]>) =>
    Object.entries(capacities).map(([resource_id, capacity]) => ({
      resource_id,
      capacity,
      availability: (windows[resource_id] || []).map(w => ({ start_time: w.start_time, end_time: w.end_time })),
    }));

  return {
    provenance: territory.resource_provenance,
    crew: rows(context.crew_capacities || {}, context.crew_windows || {}),
    machines: rows(context.machine_capacities || {}, context.machine_windows || {}),
    power_windows: context.power_windows || {},
  };
}

export function alerts(territory: LoadedTerritory, plan?: PlanRecord | null) {
  const scheduled = new Set<string>();
  for (const b of plan?.blocks || []) {
    for (const t of b.tasks || []) scheduled.add(t);
  }

  const items: any[] = [];
  for (const task of territory.maintenance_tasks) {
    if (task.overdue_days > 0 && !scheduled.has(task.task_id)) {
      items.push({
        alert_id: `OVERDUE_${task.task_id}`,
        level: task.criticality >= 8 ? 'CRITICAL' : 'WARNING',
        task_id: task.task_id,
        section_id: task.section_id,
        message: `Task ${task.task_id} (${task.task_type}) is overdue by ${task.overdue_days} day(s) and currently unscheduled.`,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      alert_id: `ALL_CLEAR_${territory.manifest.territory_id}`,
      level: 'INFO',
      message: 'All priority demands accommodated within registered operational windows.',
    });
  }

  return items;
}

export function blocksCsv(blocks: any[]): string {
  const headers = ['block_id', 'section_id', 'start_time', 'end_time', 'tasks', 'integrated', 'status'];
  const rows = blocks.map(b => [
    b.block_id,
    (b.section_ids || [b.section_id]).join(';'),
    b.start_time,
    b.end_time,
    (b.tasks || []).join(';'),
    b.integrated ? 'TRUE' : 'FALSE',
    b.status || 'DRAFT',
  ]);
  return [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
}

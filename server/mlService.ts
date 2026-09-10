import fs from 'fs';
import path from 'path';

interface TreeNode {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  value: number[];
}

interface MlModel {
  version: string;
  features: string[];
  profiles: Array<{
    train_id: string;
    train_name: string;
    station_code: string;
    station_name: string;
    train_type: string;
    route_position: number;
  }>;
  evaluation: any;
  trees: TreeNode[];
}

const ARTIFACT_PATH = path.join(process.cwd(), 'models/aggregate_delay.json');

let cachedModel: MlModel | null = null;

export function loadModel(): MlModel | null {
  if (cachedModel) return cachedModel;
  if (!fs.existsSync(ARTIFACT_PATH)) return null;
  try {
    const raw = fs.readFileSync(ARTIFACT_PATH, 'utf-8');
    const model = JSON.parse(raw);
    if (model.version !== 'aggregate-delay-rf-v1' || !model.trees || !model.profiles) {
      return null;
    }
    cachedModel = model;
    return cachedModel;
  } catch (err) {
    console.error('Failed to load ML model:', err);
    return null;
  }
}

export function riskLevel(minutes: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (minutes < 15) return 'LOW';
  if (minutes < 60) return 'MEDIUM';
  return 'HIGH';
}

export function predictFeatures(profile: any, model: MlModel): number {
  const clean = {
    train_type: profile.train_type.trim(),
    station_code: profile.station_code.trim().toUpperCase(),
    route_position: profile.route_position,
  };

  const encoded: Record<string, number> = {};
  for (const [k, v] of Object.entries(clean)) {
    if (typeof v === 'string') {
      encoded[`${k}=${v}`] = 1.0;
    } else {
      encoded[k] = v as number;
    }
  }

  const vector = model.features.map(f => encoded[f] || 0.0);
  const estimates: number[] = [];

  for (const tree of model.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      node = vector[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
    }
    estimates.push(tree.value[node]);
  }

  return estimates.reduce((a, b) => a + b, 0) / estimates.length;
}

export function getMlStatus() {
  const model = loadModel();
  return {
    model_available: model !== null,
    model_version: model?.version || null,
    target: 'aggregate_average_delay_minutes',
    source: 'PUBLIC_HISTORICAL_DATA',
    evaluation: model?.evaluation || null,
    profiles: model?.profiles || [],
    limitation: 'Historical train–station aggregates, not future run predictions. Fictional trains have no automatic mapping.',
  };
}

export function calculatePlanningRisk(
  occupancy: Array<{ train_id: string; section_id: string }>,
  mode: 'STATIC' | 'ML_ASSISTED' = 'STATIC',
  profiles: Array<{
    train_id: string;
    section_id: string;
    historical_train_id: string;
    historical_station_id: string;
  }> = []
) {
  const model = mode === 'ML_ASSISTED' ? loadModel() : null;
  const sourceProfiles = new Map<string, any>();
  if (model) {
    for (const p of model.profiles) {
      sourceProfiles.set(`${p.train_id}::${p.station_code}`, p);
    }
  }

  const predictions: any[] = [];
  const penalties: Record<string, number> = {};
  const seen = new Set<string>();

  for (const binding of profiles) {
    const key = `${binding.train_id}::${binding.section_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const sourceKey = `${binding.historical_train_id}::${binding.historical_station_id}`;
    const profile = sourceProfiles.get(sourceKey);
    let delayVal: number | null = null;
    if (model && profile) {
      try {
        delayVal = predictFeatures(profile, model);
      } catch {
        delayVal = null;
      }
    }

    predictions.push({
      ...binding,
      expected_delay_minutes: delayVal !== null ? Math.round(delayVal * 1000) / 1000 : null,
      risk_level: delayVal !== null ? riskLevel(delayVal) : 'UNKNOWN',
      model_available: delayVal !== null,
      model_version: model?.version || null,
      source: 'SYNTHETIC_FORECAST_SCENARIO',
      historical_source: 'PUBLIC_HISTORICAL_DATA',
    });

    if (delayVal !== null) {
      penalties[key] = Math.ceil(delayVal);
    }
  }

  const hasPenalties = Object.keys(penalties).length > 0;
  return {
    penalties,
    risk: {
      requested_mode: mode,
      effective_mode: hasPenalties ? 'ML_ASSISTED' : 'STATIC',
      model_available: model !== null,
      predictions,
      message: hasPenalties
        ? 'Optional aggregate-delay reserve preference; hard safety margins unchanged.'
        : 'Static planning: risk disabled, model unavailable, or no explicit historical profile binding.',
    },
  };
}

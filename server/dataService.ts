import fs from 'fs';
import path from 'path';

export interface Station {
  station_id: string;
  station_name: string;
  order: number;
}

export interface Section {
  section_id: string;
  from_station: string;
  to_station: string;
}

export interface TrainOccupancy {
  train_id: string;
  section_id: string;
  entry_time: string;
  exit_time: string;
  direction?: string;
  traffic_type?: string;
  capacity_resource_ids?: string[];
}

export interface TrainService {
  train_id: string;
  service_number: string;
  service_name: string;
  origin_station_id: string;
  destination_station_id: string;
  direction: string;
  traffic_type: string;
  source_url: string;
}

export interface MaintenanceTask {
  task_id: string;
  department: 'ENGINEERING' | 'S&T' | 'TRD' | string;
  section_id: string;
  task_type: string;
  duration_minutes: number;
  criticality: number;
  urgency: number;
  overdue_days: number;
  deadline: string;
  requires_power_block: boolean;
  crew_type: string;
  compatibility_group: string;
  machine_type?: string;
  preferred_window?: string;
  power_isolation_zone_id?: string;
  section_ids?: string[];
  capacity_resource_ids?: string[];
}

export interface ResourceWindow {
  start_time: string;
  end_time: string;
}

export interface ResourceContext {
  provenance: string;
  crew_capacities: Record<string, number>;
  machine_capacities: Record<string, number>;
  crew_windows: Record<string, ResourceWindow[]>;
  machine_windows: Record<string, ResourceWindow[]>;
  power_windows: Record<string, ResourceWindow[]>;
}

export interface TerritoryManifest {
  territory_id: string;
  display_name: string;
  description: string;
  status: 'POPULATED' | 'PLACEHOLDER';
  provenance: Array<{ label: string; datasets?: string[]; description: string }>;
  datasets: Record<string, { adapter: string; path: string }>;
  scenario_references: string[];
  planning_horizon: {
    start_time: string;
    end_time: string;
  } | null;
  resource_context?: {
    adapter: string;
    path: string;
  };
}

export interface LoadedTerritory {
  manifest: TerritoryManifest;
  stations: Station[];
  sections: Section[];
  train_occupancy: TrainOccupancy[];
  train_services: TrainService[];
  maintenance_tasks: MaintenanceTask[];
  resource_context: ResourceContext | null;
  resource_provenance: string | null;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CORRIDORS_DIR = path.join(DATA_DIR, 'corridors');
const FIXTURES_DIR = path.join(DATA_DIR, 'fixtures');

const KNOWN_TERRITORIES: Array<{ id: string; dir: string }> = [
  { id: 'saktigarh_memari_public_demo', dir: path.join(CORRIDORS_DIR, 'saktigarh_memari_public_demo') },
  { id: 'delhi_agra', dir: path.join(CORRIDORS_DIR, 'delhi_agra') },
  { id: 'western_hdn', dir: path.join(CORRIDORS_DIR, 'western_hdn') },
  { id: 'eastern_hdn_test_fixture', dir: path.join(FIXTURES_DIR, 'eastern_hdn_test_fixture') },
  { id: 'eastern_hdn', dir: path.join(CORRIDORS_DIR, 'eastern_hdn') },
];

export function listTerritories(includeTest = false): TerritoryManifest[] {
  const manifests: TerritoryManifest[] = [];
  for (const item of KNOWN_TERRITORIES) {
    const manifestPath = path.join(item.dir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest: TerritoryManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (!includeTest) {
          if (manifest.status === 'POPULATED' && manifest.provenance.some(p => p.label === 'PUBLIC_TIMETABLE_DERIVED')) {
            manifests.push(manifest);
          }
        } else {
          manifests.push(manifest);
        }
      } catch (err) {
        console.error(`Failed to read manifest at ${manifestPath}:`, err);
      }
    }
  }
  return manifests;
}

export function loadTerritory(territoryId: string): LoadedTerritory {
  const entry = KNOWN_TERRITORIES.find(t => t.id === territoryId);
  if (!entry) {
    const err: any = new Error(`Unknown territory ID: ${territoryId}`);
    err.code = 'UNKNOWN_TERRITORY';
    err.status = 404;
    throw err;
  }

  const manifestPath = path.join(entry.dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const err: any = new Error(`Manifest not found for territory ID: ${territoryId}`);
    err.code = 'UNKNOWN_TERRITORY';
    err.status = 404;
    throw err;
  }

  const manifest: TerritoryManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.status !== 'POPULATED') {
    const err: any = new Error(`Territory ${territoryId} is not populated.`);
    err.code = 'TERRITORY_NOT_POPULATED';
    err.status = 409;
    throw err;
  }

  const readJson = (filename?: string) => {
    if (!filename) return [];
    const filePath = path.join(entry.dir, filename);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  };

  const stations: Station[] = readJson(manifest.datasets?.stations?.path);
  const sections: Section[] = readJson(manifest.datasets?.sections?.path);
  const train_occupancy: TrainOccupancy[] = readJson(manifest.datasets?.train_occupancy?.path);
  const train_services: TrainService[] = readJson(manifest.datasets?.train_services?.path);
  const maintenance_tasks: MaintenanceTask[] = readJson(manifest.datasets?.maintenance_tasks?.path);

  let resource_context: ResourceContext | null = null;
  let resource_provenance: string | null = null;
  if (manifest.resource_context?.path) {
    const resPath = path.join(entry.dir, manifest.resource_context.path);
    if (fs.existsSync(resPath)) {
      resource_context = JSON.parse(fs.readFileSync(resPath, 'utf-8'));
      resource_provenance = resource_context?.provenance || 'SYNTHETIC_DECISION_SUPPORT';
    }
  }

  return {
    manifest,
    stations,
    sections,
    train_occupancy,
    train_services,
    maintenance_tasks,
    resource_context,
    resource_provenance,
  };
}

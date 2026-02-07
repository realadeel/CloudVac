import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import type { Resource, CFStack, CostSummary } from '../../../shared/types.js';

const DB_DIR = join(homedir(), '.aws-auditor');
const DB_PATH = join(DB_DIR, 'cache.db');

// Ensure directory exists
mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS scan_results (
    profile TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
    resources TEXT NOT NULL,
    stacks TEXT NOT NULL,
    PRIMARY KEY (profile)
  );

  CREATE TABLE IF NOT EXISTS cost_results (
    profile TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    data TEXT NOT NULL,
    PRIMARY KEY (profile)
  );
`);

// Prepared statements
const upsertScan = db.prepare(`
  INSERT OR REPLACE INTO scan_results (profile, scanned_at, resources, stacks)
  VALUES (?, datetime('now'), ?, ?)
`);

const getScan = db.prepare(`
  SELECT resources, stacks, scanned_at FROM scan_results WHERE profile = ?
`);

const upsertCost = db.prepare(`
  INSERT OR REPLACE INTO cost_results (profile, fetched_at, data)
  VALUES (?, datetime('now'), ?)
`);

const getCost = db.prepare(`
  SELECT data, fetched_at FROM cost_results WHERE profile = ?
`);

const deleteScan = db.prepare(`
  DELETE FROM scan_results WHERE profile = ?
`);

const deleteCost = db.prepare(`
  DELETE FROM cost_results WHERE profile = ?
`);

export interface CachedScan {
  resources: Resource[];
  stacks: CFStack[];
  scannedAt: string;
}

export interface CachedCost {
  data: CostSummary;
  fetchedAt: string;
}

export function saveScanResults(profile: string, resources: Resource[], stacks: CFStack[]): void {
  upsertScan.run(profile, JSON.stringify(resources), JSON.stringify(stacks));
}

export function getScanResults(profile: string): CachedScan | null {
  const row = getScan.get(profile) as { resources: string; stacks: string; scanned_at: string } | undefined;
  if (!row) return null;
  return {
    resources: JSON.parse(row.resources),
    stacks: JSON.parse(row.stacks),
    scannedAt: row.scanned_at,
  };
}

export function saveCostResults(profile: string, data: CostSummary): void {
  upsertCost.run(profile, JSON.stringify(data));
}

export function getCostResults(profile: string): CachedCost | null {
  const row = getCost.get(profile) as { data: string; fetched_at: string } | undefined;
  if (!row) return null;
  return {
    data: JSON.parse(row.data),
    fetchedAt: row.fetched_at,
  };
}

export function clearProfileCache(profile: string): void {
  deleteScan.run(profile);
  deleteCost.run(profile);
}

export function getAllCachedProfiles(): string[] {
  const rows = db.prepare('SELECT DISTINCT profile FROM scan_results').all() as { profile: string }[];
  return rows.map((r) => r.profile);
}

export function closeDb(): void {
  db.close();
}

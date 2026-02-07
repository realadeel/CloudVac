import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import type { Resource, CFStack, CostSummary } from '../../../shared/types.js';

const DB_DIR = join(homedir(), '.cloudvac');
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

  CREATE TABLE IF NOT EXISTS bucket_stats (
    profile TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    object_count INTEGER NOT NULL,
    total_size INTEGER NOT NULL,
    computed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (profile, bucket_name)
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

const upsertBucketStats = db.prepare(`
  INSERT OR REPLACE INTO bucket_stats (profile, bucket_name, object_count, total_size, computed_at)
  VALUES (?, ?, ?, ?, datetime('now'))
`);

const getBucketStatsOne = db.prepare(`
  SELECT object_count, total_size, computed_at FROM bucket_stats WHERE profile = ? AND bucket_name = ?
`);

const getBucketStatsAll = db.prepare(`
  SELECT bucket_name, object_count, total_size, computed_at FROM bucket_stats WHERE profile = ?
`);

const deleteBucketStats = db.prepare(`
  DELETE FROM bucket_stats WHERE profile = ?
`);

const deleteBucketStatsOne = db.prepare(`
  DELETE FROM bucket_stats WHERE profile = ? AND bucket_name = ?
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

export interface CachedBucketStats {
  objectCount: number;
  totalSize: number;
  computedAt: string;
}

export function saveBucketStats(profile: string, bucketName: string, objectCount: number, totalSize: number): void {
  upsertBucketStats.run(profile, bucketName, objectCount, totalSize);
}

export function getBucketStats(profile: string, bucketName: string): CachedBucketStats | null {
  const row = getBucketStatsOne.get(profile, bucketName) as { object_count: number; total_size: number; computed_at: string } | undefined;
  if (!row) return null;
  return { objectCount: row.object_count, totalSize: row.total_size, computedAt: row.computed_at };
}

export function getAllBucketStats(profile: string): Record<string, CachedBucketStats> {
  const rows = getBucketStatsAll.all(profile) as { bucket_name: string; object_count: number; total_size: number; computed_at: string }[];
  const result: Record<string, CachedBucketStats> = {};
  for (const row of rows) {
    result[row.bucket_name] = { objectCount: row.object_count, totalSize: row.total_size, computedAt: row.computed_at };
  }
  return result;
}

export function deleteBucketStatsEntry(profile: string, bucketName: string): void {
  deleteBucketStatsOne.run(profile, bucketName);
}

export function clearProfileCache(profile: string): void {
  deleteScan.run(profile);
  deleteCost.run(profile);
  deleteBucketStats.run(profile);
}

export function getAllCachedProfiles(): string[] {
  const rows = db.prepare('SELECT DISTINCT profile FROM scan_results').all() as { profile: string }[];
  return rows.map((r) => r.profile);
}

export function closeDb(): void {
  db.close();
}

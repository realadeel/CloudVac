import { Router } from 'express';
import type { Resource } from '../../../shared/types.js';
import { resourceCache } from './scan.js';
import { getScanResults } from '../db/index.js';

const router = Router();

export function deduplicateResources(resources: Resource[]): Resource[] {
  const seen = new Set<string>();
  return resources.filter((r) => {
    const key = `${r.id}::${r.region}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getResourceData(profileName: string) {
  // Try in-memory cache first (fastest)
  const memCached = resourceCache.get(profileName);
  if (memCached) {
    return { resources: deduplicateResources(memCached.resources), stacks: memCached.stacks, source: 'memory' as const, scannedAt: null };
  }

  // Fall back to SQLite cache
  const dbCached = getScanResults(profileName);
  if (dbCached) {
    const resources = deduplicateResources(dbCached.resources);
    // Warm the in-memory cache with clean data
    resourceCache.set(profileName, { resources, stacks: dbCached.stacks });
    return { resources, stacks: dbCached.stacks, source: 'database' as const, scannedAt: dbCached.scannedAt };
  }

  return null;
}

router.get('/api/resources', (req, res) => {
  const profileName = req.query.profile as string;
  if (!profileName) {
    res.status(400).json({ error: 'Missing profile parameter' });
    return;
  }

  const data = getResourceData(profileName);
  if (!data) {
    res.json({ resources: [], stacks: [], summary: { total: 0, managed: 0, loose: 0, byService: {} }, scannedAt: null });
    return;
  }

  const { resources, stacks, scannedAt } = data;

  // Apply filters
  const service = req.query.service as string | undefined;
  const region = req.query.region as string | undefined;
  const managed = req.query.managed as string | undefined;
  const search = req.query.search as string | undefined;

  let filtered = resources;

  if (service) {
    const services = service.split(',');
    filtered = filtered.filter((r) => services.includes(r.service));
  }
  if (region) {
    const regions = region.split(',');
    filtered = filtered.filter((r) => regions.includes(r.region));
  }
  if (managed !== undefined) {
    const isMgd = managed === 'true';
    filtered = filtered.filter((r) => r.managed === isMgd);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }

  // Summary
  const byService: Record<string, number> = {};
  for (const r of filtered) {
    byService[r.service] = (byService[r.service] ?? 0) + 1;
  }

  res.json({
    resources: filtered,
    stacks,
    summary: {
      total: filtered.length,
      managed: filtered.filter((r) => r.managed).length,
      loose: filtered.filter((r) => !r.managed && r.type !== 'cloudformation-stack').length,
      byService,
    },
    scannedAt,
  });
});

router.get('/api/resources/:id', (req, res) => {
  const profileName = req.query.profile as string;
  if (!profileName) {
    res.status(400).json({ error: 'Missing profile parameter' });
    return;
  }

  const data = getResourceData(profileName);
  if (!data) {
    res.status(404).json({ error: 'No scan data. Run a scan first.' });
    return;
  }

  const resource = data.resources.find((r) => r.id === req.params.id);
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  res.json(resource);
});

export default router;

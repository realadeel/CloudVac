import { Router } from 'express';
import type { Resource } from '../../../shared/types.js';
import { resourceCache } from './scan.js';
import { getScanResults } from '../db/index.js';
import { findOrphanedLogGroups } from './resource-utils.js';

export { findOrphanedLogGroups } from './resource-utils.js';

const router = Router();

function getResources(profileName: string): Resource[] | null {
  const memCached = resourceCache.get(profileName);
  if (memCached) return memCached.resources;
  const dbCached = getScanResults(profileName);
  if (dbCached) return dbCached.resources;
  return null;
}

router.get('/api/actions/orphaned-log-groups', (req, res) => {
  const profileName = req.query.profile as string;
  if (!profileName) {
    res.status(400).json({ error: 'Missing profile parameter' });
    return;
  }

  const resources = getResources(profileName);
  if (!resources) {
    res.status(404).json({ error: 'No scan data. Run a scan first.' });
    return;
  }

  const orphaned = findOrphanedLogGroups(resources);

  res.json({
    orphaned: orphaned.map((o) => ({
      id: o.resource.id,
      name: o.resource.name,
      region: o.resource.region,
      expectedResource: o.expectedResource,
      service: o.service,
      storedBytes: o.resource.metadata?.storedBytes ?? 0,
      retentionDays: o.resource.metadata?.retentionDays ?? 'Never expire',
      createdAt: o.resource.createdAt,
    })),
    total: orphaned.length,
  });
});

export default router;

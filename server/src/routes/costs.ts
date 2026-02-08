import { Router } from 'express';
import { getProfile } from '../aws/credentials.js';
import { getCostSummary } from '../aws/cost-explorer.js';
import { saveCostResults, getCostResults, getScanResults, getAllBucketStats } from '../db/index.js';
import { estimateMonthlyCost } from '../pricing/estimate.js';

const router = Router();

router.get('/api/costs', async (req, res) => {
  const profileName = req.query.profile as string;
  if (!profileName) {
    res.status(400).json({ error: 'Missing profile parameter' });
    return;
  }

  const profile = getProfile(profileName);
  if (!profile) {
    res.status(404).json({ error: `Profile "${profileName}" not found` });
    return;
  }

  // Check if we should force refresh
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh) {
    // Try cached costs first
    const cached = getCostResults(profileName);
    if (cached) {
      res.json({ ...cached.data, fetchedAt: cached.fetchedAt, cached: true });
      return;
    }
  }

  try {
    const costs = await getCostSummary(profile);
    // Save to SQLite cache
    saveCostResults(profileName, costs);
    res.json({ ...costs, fetchedAt: new Date().toISOString(), cached: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Per-resource cost estimates (pure math on cached data, no AWS calls)
// ---------------------------------------------------------------------------
router.get('/api/costs/estimates', (req, res) => {
  const profileName = req.query.profile as string;
  if (!profileName) {
    res.status(400).json({ error: 'Missing profile parameter' });
    return;
  }

  const cached = getScanResults(profileName);
  if (!cached) {
    res.status(404).json({ error: 'No scan data. Run a scan first.' });
    return;
  }

  const bucketStatsMap = getAllBucketStats(profileName);
  const estimates: Record<string, number | null> = {};

  for (const resource of cached.resources) {
    const stats = resource.type === 's3-bucket' ? bucketStatsMap[resource.name] ?? null : null;
    estimates[resource.id] = estimateMonthlyCost(resource, stats);
  }

  res.json({ estimates });
});

export default router;

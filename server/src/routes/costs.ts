import { Router } from 'express';
import { getProfile } from '../aws/credentials.js';
import { getCostSummary } from '../aws/cost-explorer.js';
import { saveCostResults, getCostResults } from '../db/index.js';

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

export default router;

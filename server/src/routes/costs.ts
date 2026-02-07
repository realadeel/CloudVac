import { Router } from 'express';
import { getProfile } from '../aws/credentials.js';
import { getCostSummary } from '../aws/cost-explorer.js';

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

  try {
    const costs = await getCostSummary(profile);
    res.json(costs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

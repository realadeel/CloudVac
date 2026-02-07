import { Router } from 'express';
import { getProfile } from '../aws/credentials.js';
import { runFullScan } from '../aws/scanners/index.js';
import { createSSEStream } from '../sse/stream.js';
import type { Resource, CFStack } from '../../../shared/types.js';

const router = Router();

// In-memory cache of scan results per profile
export const resourceCache = new Map<string, { resources: Resource[]; stacks: CFStack[] }>();

router.get('/api/scan', async (req, res) => {
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

  const sse = createSSEStream(res);
  let aborted = false;
  sse.onDisconnect(() => {
    aborted = true;
  });

  try {
    const result = await runFullScan(profile, (event) => {
      if (aborted) return;
      sse.send(event.type, event);
    });

    resourceCache.set(profileName, result);
  } catch (err) {
    if (!aborted) {
      sse.send('error', { message: (err as Error).message });
    }
  } finally {
    if (!aborted) {
      sse.close();
    }
  }
});

export default router;

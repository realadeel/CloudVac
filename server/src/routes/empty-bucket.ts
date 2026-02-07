import { Router } from 'express';
import { getProfile } from '../aws/credentials.js';
import { resourceCache } from './scan.js';
import { createSSEStream } from '../sse/stream.js';
import { emptyS3Bucket } from '../deletion/strategies/s3.js';
import { saveBucketStats } from '../db/index.js';

const router = Router();

router.post('/api/empty-bucket', async (req, res) => {
  const { profile: profileName, resourceId } = req.body;

  if (!profileName || !resourceId) {
    res.status(400).json({ error: 'Missing profile or resourceId' });
    return;
  }

  const profile = getProfile(profileName);
  if (!profile) {
    res.status(404).json({ error: `Profile "${profileName}" not found` });
    return;
  }

  const cached = resourceCache.get(profileName);
  if (!cached) {
    res.status(400).json({ error: 'No scan data. Run a scan first.' });
    return;
  }

  const resource = cached.resources.find((r) => r.id === resourceId && r.type === 's3-bucket');
  if (!resource) {
    res.status(404).json({ error: 'S3 bucket not found in scan results.' });
    return;
  }

  const sse = createSSEStream(res);
  let aborted = false;
  sse.onDisconnect(() => { aborted = true; });

  try {
    await emptyS3Bucket(profile, resource, (msg) => {
      if (!aborted) sse.send('progress', { message: msg });
    });
    // Update cached stats to reflect empty bucket
    saveBucketStats(profileName, resource.name, 0, 0);
    if (!aborted) sse.send('complete', { bucket: resource.name, message: `Bucket "${resource.name}" emptied successfully.` });
  } catch (err) {
    if (!aborted) sse.send('error', { message: (err as Error).message });
  } finally {
    if (!aborted) sse.close();
  }
});

export default router;

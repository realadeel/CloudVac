import { Router } from 'express';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getProfile } from '../aws/credentials.js';
import * as clients from '../aws/clients.js';
import { resourceCache } from './scan.js';
import { getBucketStats, saveBucketStats, getAllBucketStats } from '../db/index.js';
import type { Region } from '../config.js';

const router = Router();

/** GET /api/s3/stats/all — return all cached bucket stats for a profile */
router.get('/api/s3/stats/all', (req, res) => {
  const profileName = req.query.profile as string;
  if (!profileName) {
    res.status(400).json({ error: 'Missing profile query param' });
    return;
  }
  const stats = getAllBucketStats(profileName);
  res.json({ stats });
});

/** GET /api/s3/:bucketName/stats — on-demand bucket size (object count + total bytes) */
router.get('/api/s3/:bucketName/stats', async (req, res) => {
  const { bucketName } = req.params;
  const profileName = req.query.profile as string;
  const refresh = req.query.refresh === 'true';

  if (!profileName) {
    res.status(400).json({ error: 'Missing profile query param' });
    return;
  }

  const profile = getProfile(profileName);
  if (!profile) {
    res.status(404).json({ error: `Profile "${profileName}" not found` });
    return;
  }

  const cached = resourceCache.get(profileName);
  const bucket = cached?.resources.find((r) => r.id === bucketName && r.type === 's3-bucket');
  if (!bucket) {
    res.status(404).json({ error: `Bucket "${bucketName}" not found in scan results. Run a scan first.` });
    return;
  }

  // Serve from SQLite cache unless refresh requested
  if (!refresh) {
    const cachedStats = getBucketStats(profileName, bucketName);
    if (cachedStats) {
      res.json({ bucketName, ...cachedStats, cached: true });
      return;
    }
  }

  const region = (bucket.metadata.bucketRegion ?? bucket.region) as Region;
  const s3 = clients.s3(profile, region);

  try {
    let objectCount = 0;
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      const resp = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of resp.Contents ?? []) {
        objectCount++;
        totalSize += obj.Size ?? 0;
      }
      continuationToken = resp.NextContinuationToken;
    } while (continuationToken);

    const computedAt = new Date().toISOString();

    // Save to SQLite
    saveBucketStats(profileName, bucketName, objectCount, totalSize);

    res.json({ bucketName, objectCount, totalSize, computedAt, cached: false });
  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

/** GET /api/s3/:bucketName/objects — paginated object listing with folder navigation */
router.get('/api/s3/:bucketName/objects', async (req, res) => {
  const { bucketName } = req.params;
  const profileName = req.query.profile as string;
  const prefix = (req.query.prefix as string) ?? '';
  const cursor = (req.query.cursor as string) || undefined;
  const pageSize = Math.min(Number(req.query.pageSize) || 200, 1000);

  if (!profileName) {
    res.status(400).json({ error: 'Missing profile query param' });
    return;
  }

  const profile = getProfile(profileName);
  if (!profile) {
    res.status(404).json({ error: `Profile "${profileName}" not found` });
    return;
  }

  const cached = resourceCache.get(profileName);
  const bucket = cached?.resources.find((r) => r.id === bucketName && r.type === 's3-bucket');
  if (!bucket) {
    res.status(404).json({ error: `Bucket "${bucketName}" not found in scan results. Run a scan first.` });
    return;
  }

  const region = (bucket.metadata.bucketRegion ?? bucket.region) as Region;
  const s3 = clients.s3(profile, region);

  try {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/',
        MaxKeys: pageSize,
        ContinuationToken: cursor,
      })
    );

    const folders = (resp.CommonPrefixes ?? []).map((cp) => {
      const full = cp.Prefix ?? '';
      const segments = full.replace(/\/$/, '').split('/');
      return { name: segments[segments.length - 1], prefix: full };
    });

    const objects = (resp.Contents ?? [])
      .filter((obj) => obj.Key !== prefix) // exclude the "folder" placeholder object
      .map((obj) => {
        const key = obj.Key ?? '';
        const name = key.slice(prefix.length);
        return {
          key,
          name,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified?.toISOString() ?? '',
          storageClass: obj.StorageClass ?? 'STANDARD',
        };
      });

    res.json({
      bucketName,
      prefix,
      folders,
      objects,
      nextCursor: resp.NextContinuationToken ?? null,
      isTruncated: resp.IsTruncated ?? false,
    });
  } catch (err) {
    const msg = (err as Error).message ?? 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;

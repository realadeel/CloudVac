import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getProfile } from '../aws/credentials.js';
import { resourceCache } from './scan.js';
import { executeDeletion } from '../deletion/executor.js';
import { createSSEStream } from '../sse/stream.js';
import type { DeletionJob } from '../../../shared/types.js';

const router = Router();

// Active deletion jobs
const jobs = new Map<string, DeletionJob>();

router.post('/api/delete', (req, res) => {
  const { profile: profileName, resourceIds, dryRun = true } = req.body;

  if (!profileName || !resourceIds?.length) {
    res.status(400).json({ error: 'Missing profile or resourceIds' });
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

  const resources = cached.resources.filter((r) => resourceIds.includes(r.id));
  if (resources.length === 0) {
    res.status(400).json({ error: 'No matching resources found in scan results.' });
    return;
  }

  const jobId = uuidv4();
  const job: DeletionJob = {
    jobId,
    profile: profileName,
    resourceIds,
    dryRun,
    status: 'pending',
    events: [],
  };

  jobs.set(jobId, job);

  // Start the deletion in the background
  job.status = 'running';
  executeDeletion(profile, resources, dryRun, (event, data) => {
    job.events.push({ type: event as any, ...(data as object) });
  })
    .then(() => {
      job.status = 'complete';
    })
    .catch((err) => {
      job.status = 'error';
      job.events.push({ type: 'error', message: (err as Error).message });
    });

  res.json({ jobId });
});

router.get('/api/delete/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  const sse = createSSEStream(res);
  let closed = false;
  sse.onDisconnect(() => {
    closed = true;
  });

  // Replay existing events
  let cursor = 0;
  for (const evt of job.events) {
    sse.send(evt.type, evt);
    cursor++;
  }

  // Poll for new events
  const interval = setInterval(() => {
    if (closed) {
      clearInterval(interval);
      return;
    }

    while (cursor < job.events.length) {
      sse.send(job.events[cursor].type, job.events[cursor]);
      cursor++;
    }

    if (job.status === 'complete' || job.status === 'error') {
      clearInterval(interval);
      if (!closed) sse.close();
    }
  }, 100);
});

export default router;

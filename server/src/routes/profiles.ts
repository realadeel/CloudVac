import { Router } from 'express';
import { getProfileInfoList } from '../aws/credentials.js';

const router = Router();

router.get('/api/profiles', (_req, res) => {
  try {
    const profiles = getProfileInfoList();
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

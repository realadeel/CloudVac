import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import profileRoutes from './routes/profiles.js';
import costRoutes from './routes/costs.js';
import scanRoutes from './routes/scan.js';
import resourceRoutes from './routes/resources.js';
import deleteRoutes from './routes/delete.js';
import emptyBucketRoutes from './routes/empty-bucket.js';
import s3Routes from './routes/s3.js';
import actionRoutes from './routes/actions.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use(profileRoutes);
app.use(costRoutes);
app.use(scanRoutes);
app.use(resourceRoutes);
app.use(deleteRoutes);
app.use(emptyBucketRoutes);
app.use(s3Routes);
app.use(actionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`CloudVac server running on http://localhost:${PORT}`);
});

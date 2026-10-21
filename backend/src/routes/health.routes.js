import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'spotizan-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      target: 'mongodb',
    },
  });
});

export default router;

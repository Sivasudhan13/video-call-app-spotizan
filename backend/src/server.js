import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { initializeSocketServer } from './realtime/socketServer.js';
import { ensureAdminExists } from './scripts/seedAdmin.js';

const server = http.createServer(app);

async function startServer() {
  try {
    logger.info(`Starting Spotizan Backend in [${env.NODE_ENV}] mode...`);
    
    // Connect to MongoDB
    await connectDB();

    // Ensure default administrator account is initialized
    await ensureAdminExists();

    // Initialize Real-time WebRTC Signaling & Matchmaking Server
    initializeSocketServer(server);

    server.listen(env.PORT, () => {
      logger.info(`Spotizan Server running on http://localhost:${env.PORT}`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    logger.info('All resources released. Process exiting cleanly.');
    process.exit(0);
  });

  // Force shutdown after timeout if pending connections hang
  setTimeout(() => {
    logger.error('Shutdown timeout reached. Forcing immediate termination.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

startServer();

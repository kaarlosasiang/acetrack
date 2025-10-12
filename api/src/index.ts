import config from '@/config';
import Database from '@/config/database';
import logger from '@/shared/utils/logger';
import appFactory from './app';

const server = {
  /**
   * Start the server and setup all connections
   */
  start: async (): Promise<void> => {
    try {
      // Get database instance
      const database = Database.getInstance();

      // Connect to database
      await database.connect();

      // Create Express application
      const app = appFactory.createApp();

      // Start server
      const httpServer = app.listen(config.server.port, () => {
        logger.info(`🚀 AceTrack API server is running on port ${config.server.port}`);
        logger.info(`📱 Environment: ${config.server.nodeEnv}`);
        logger.info(
          `🔗 API Base URL: http://localhost:${config.server.port}${config.server.apiPrefix}/${config.server.apiVersion}`
        );
        logger.info(`🏥 Health Check: http://localhost:${config.server.port}/health`);
      });

      // Handle server errors
      httpServer.on('error', (error: Error) => {
        logger.error('❌ Server error:', error);
        process.exit(1);
      });

      // Setup graceful shutdown
      server.setupGracefulShutdown(httpServer, database);

      // Setup global error handlers
      server.setupGlobalErrorHandlers();
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  },

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown: (httpServer: any, database: Database): void => {
    const gracefulShutdown = (signal: string) => {
      logger.info(`📋 Received ${signal}. Graceful shutdown initiated...`);

      httpServer.close(async () => {
        logger.info('🔒 HTTP server closed');

        try {
          await database.disconnect();
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  },

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers: (): void => {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('💥 Unhandled Rejection:', reason);
      process.exit(1);
    });
  },
};

// Start the server
server.start();

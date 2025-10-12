import compression from 'compression';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import config from '@/config';
import { errorHandler } from '@/shared/middleware/errorHandler';
import { AppError } from '@/shared/utils/appError';

// Import routes
import authRoutes from '@/modules/auth/authRoutes';
import eventRoutes from '@/modules/events/eventRoutes';
import organizationMemberRoutes from '@/modules/organizationMembers/organizationMemberRoutes';
import organizationRoutes from '@/modules/organizations/organizationRoutes';
import subscriptionRoutes from '@/modules/subscriptions/subscriptionRoutes';

const appFactory = {
  /**
   * Setup middleware for the Express application
   */
  setupMiddleware: (app: Application): void => {
    // Trust proxy (for deployments behind reverse proxy)
    app.set('trust proxy', 1);

    // Security middleware
    app.use(helmet());

    // CORS
    app.use(
      cors({
        origin: config.cors.origins,
        credentials: true,
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    app.use(compression());

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // HTTP request logger
    if (config.server.nodeEnv === 'development') {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined'));
    }
  },

  /**
   * Setup routes for the Express application
   */
  setupRoutes: (app: Application): void => {
    // Health check
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'AceTrack API is running',
        data: {
          environment: config.server.nodeEnv,
          version: config.server.apiVersion,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // API routes
    app.use(`${config.server.apiPrefix}/${config.server.apiVersion}/auth`, authRoutes);
    app.use(`${config.server.apiPrefix}/${config.server.apiVersion}/events`, eventRoutes);
    app.use(
      `${config.server.apiPrefix}/${config.server.apiVersion}/organization-members`,
      organizationMemberRoutes
    );
    app.use(
      `${config.server.apiPrefix}/${config.server.apiVersion}/organizations`,
      organizationRoutes
    );
    app.use(
      `${config.server.apiPrefix}/${config.server.apiVersion}/subscriptions`,
      subscriptionRoutes
    );

    // 404 handler for undefined routes
    app.all('*', (req: Request, res: Response, next: NextFunction) => {
      next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    });
  },

  /**
   * Setup error handling for the Express application
   */
  setupErrorHandling: (app: Application): void => {
    app.use(errorHandler);
  },

  /**
   * Create and configure the Express application
   */
  createApp: (): Application => {
    const app = express();

    appFactory.setupMiddleware(app);
    appFactory.setupRoutes(app);
    appFactory.setupErrorHandling(app);

    return app;
  },
};

export default appFactory;

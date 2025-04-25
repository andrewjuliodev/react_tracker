import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import activityRoutes from './routes/activityRoutes';
import logger from '../utils/logger';
import errorHandler from './utils/errorHandler';

// Initialize environment variables
dotenv.config();

// Create logger instance for server
const serverLogger = logger.createContextLogger('Server');

/**
 * Main entry point for the Node.js Express server.
 * Handles server initialization, configuration, middleware setup,
 * route registration, and error handling.
 */

/**
 * Initializes Express server with middleware
 * @returns {Object} Configured Express app
 */
function initializeServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  const environment = process.env.NODE_ENV || 'development';
  
  // Server configuration
  app.set('port', port);
  app.set('env', environment);
  
  // Security middleware
  app.use(helmet());
  
  // CORS middleware
  app.use(cors(setupCorsConfig()));
  
  // Request parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Request logging middleware
  if (environment !== 'test') {
    app.use(morgan(environment === 'development' ? 'dev' : 'combined'));
  }
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', environment });
  });
  
  // API version prefix
  const API_VERSION = process.env.API_VERSION || 'v1';
  const API_BASE_PATH = `/api/${API_VERSION}`;
  
  // Register routes
  app.use(`${API_BASE_PATH}/activities`, activityRoutes);
  
  // Error handling middleware (must be registered last)
  app.use(errorHandler);
  
  return app;
}

/**
 * Sets up CORS configuration
 * @returns {Object} CORS middleware options
 */
function setupCorsConfig() {
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:19000';
  
  return {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours in seconds
  };
}

/**
 * Starts server listening on configured port
 * @returns {Object} HTTP server instance
 */
function startServer(app) {
  const port = app.get('port');
  
  const server = app.listen(port, () => {
    serverLogger.info(`Server started on port ${port} in ${app.get('env')} mode`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    
    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;
    
    // Handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        serverLogger.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        serverLogger.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
  
  // Set up graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown(server));
  process.on('SIGINT', () => gracefulShutdown(server));
  
  return server;
}

/**
 * Handles graceful server shutdown
 * @param {Object} server - HTTP server instance
 * @returns {Promise<void>} Resolves when shutdown complete
 */
async function gracefulShutdown(server) {
  serverLogger.info('Received shutdown signal, closing server...');
  
  try {
    // Close HTTP server
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    // Close any database connections or other resources here
    // ...
    
    serverLogger.info('Server shutdown completed');
    process.exit(0);
  } catch (error) {
    serverLogger.error('Error during shutdown', error);
    process.exit(1);
  }
}

/**
 * Global error handler for unhandled exceptions
 */
process.on('uncaughtException', (error) => {
  serverLogger.error('Uncaught exception', error);
  // Perform any cleanup necessary
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  serverLogger.error('Unhandled promise rejection', { reason });
  // Perform any cleanup necessary
  // Don't exit process here, as it might be recoverable
});

// Initialize and start the server
const app = initializeServer();
const server = startServer(app);

// Export for testing purposes
export { app, server };
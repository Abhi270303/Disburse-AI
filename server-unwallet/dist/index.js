"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const middleware_1 = require("./middleware");
const routes_1 = __importDefault(require("./routes"));
const utils_1 = require("./utils");
// Validate configuration before starting
(0, config_1.validateConfig)();
// Initialize Express app
const app = (0, express_1.default)();
// Trust proxy for production deployment
app.set('trust proxy', 1);
// Global middleware - Enhanced CORS configuration
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Allow all origins for development and testing
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'Cache-Control',
        'Pragma'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    preflightContinue: false
}));
// Handle preflight requests explicitly
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});
// Add CORS headers to all responses
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use(middleware_1.requestLogger);
// Rate limiting
app.use(middleware_1.generalLimiter);
// Mount all routes
app.use('/', routes_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date().toISOString()
    });
});
// Global error handler (must be last)
app.use(middleware_1.errorHandler);
// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    utils_1.Logger.info(`Received ${signal}, starting graceful shutdown...`);
    // Close server
    server.close(() => {
        utils_1.Logger.info('HTTP server closed');
        // Exit process
        process.exit(0);
    });
    // Force close after 30 seconds
    setTimeout(() => {
        utils_1.Logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};
// Start server
const server = app.listen(config_1.config.port, () => {
    utils_1.Logger.info(`🚀 Server running on port ${config_1.config.port}`);
    utils_1.Logger.info(`📡 Health check: http://localhost:${config_1.config.port}/health`);
    utils_1.Logger.info(`📚 API docs: http://localhost:${config_1.config.port}/`);
    utils_1.Logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    utils_1.Logger.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    utils_1.Logger.error('Uncaught Exception:', { error });
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map
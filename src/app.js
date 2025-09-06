/**
 * Application Entry Point
 * Orchestrates service initialization and startup
 */

const telegramBot = require('./bot/telegramBot');
const logger = require('./services/loggingService');
const config = require('./config/environment');

class Application {
    constructor() {
        this.isStarted = false;
        this.services = [];
    }

    async start() {
        if (this.isStarted) {
            logger.warn('Application already started');
            return;
        }

        try {
            logger.info('🚀 Starting Telegram OCR Betting Slip Bot...');
            logger.info(`Environment: ${config.isDevelopment() ? 'development' : 'production'}`);

            // Display configuration summary
            this.displayConfigSummary();

            // Initialize and start Telegram bot service
            await telegramBot.initialize();
            this.services.push(telegramBot);

            this.isStarted = true;
            logger.info('✅ Application started successfully');
            
            // Log system metrics periodically in development
            if (config.isDevelopment()) {
                setInterval(() => {
                    logger.logSystemMetrics();
                }, 60000); // Every minute
            }

        } catch (error) {
            logger.logError(error, { operation: 'application_startup' });
            console.error('❌ Failed to start application:', error);
            process.exit(1);
        }
    }

    displayConfigSummary() {
        const summary = {
            ocrWorkers: config.get('ocr.workerPoolSize'),
            cacheEnabled: config.get('cache.enabled'),
            cacheTTL: config.get('cache.ttlMinutes'),
            logLevel: config.get('logging.level'),
            concurrentProcessing: config.get('performance.concurrentProcessing'),
            hasFootballAPI: !!config.get('apis.football'),
            hasBraveAPI: !!config.get('apis.brave')
        };

        logger.info('Configuration loaded', summary);
    }

    async shutdown() {
        if (!this.isStarted) return;

        logger.info('🛑 Shutting down application...');
        
        try {
            // Shutdown services in reverse order
            for (const service of this.services.reverse()) {
                if (service.shutdown) {
                    await service.shutdown();
                }
            }

            this.isStarted = false;
            logger.info('✅ Application shutdown complete');

        } catch (error) {
            logger.logError(error, { operation: 'application_shutdown' });
            console.error('❌ Error during shutdown:', error);
        }
    }
}

// Create and start application
const app = new Application();

// Handle process signals
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.logError(error, { operation: 'uncaught_exception' });
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.logError(new Error(String(reason)), { 
        operation: 'unhandled_rejection',
        promise: promise.toString()
    });
    console.error('💥 Unhandled Promise Rejection:', reason);
    process.exit(1);
});

// Start the application
app.start();

module.exports = app;
/**
 * Logging Service
 * Centralized logging with different levels and structured output
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/environment');

class LoggingService {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        this.currentLevel = this.levels[config.get('logging.level')] || this.levels.info;
        this.enableConsole = config.get('logging.enableConsole');
        this.enableFile = config.get('logging.enableFile');
        
        // Create logs directory if file logging is enabled
        if (this.enableFile) {
            this.logDir = path.join(process.cwd(), 'logs');
            this.ensureLogDirectory();
        }

        // Performance tracking
        this.performanceTracker = new Map();
    }

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }
    }

    formatLogMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };

        return {
            formatted: `${timestamp} [${level.toUpperCase()}] ${message}${Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''}`,
            structured: logEntry
        };
    }

    shouldLog(level) {
        return this.levels[level] <= this.currentLevel;
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const { formatted, structured } = this.formatLogMessage(level, message, meta);

        // Console output
        if (this.enableConsole) {
            const consoleMethod = level === 'error' ? console.error : 
                                 level === 'warn' ? console.warn : 
                                 console.log;
            
            const emoji = level === 'error' ? '❌' : 
                         level === 'warn' ? '⚠️' : 
                         level === 'info' ? 'ℹ️' : '🐛';
            
            consoleMethod(`${emoji} ${formatted}`);
        }

        // File output
        if (this.enableFile) {
            this.writeToFile(level, structured);
        }

        // Emit log event for external listeners
        this.emit('log', structured);
    }

    writeToFile(level, logEntry) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `${date}.log`);
            const logLine = JSON.stringify(logEntry) + '\n';
            
            fs.appendFileSync(logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Telegram-specific logging methods
    logTelegramMessage(msg, action = 'received') {
        const meta = {
            chatId: msg.chat?.id,
            messageId: msg.message_id,
            userId: msg.from?.id,
            username: msg.from?.username,
            chatType: msg.chat?.type,
            messageType: msg.photo ? 'photo' : msg.document ? 'document' : 'text',
            action
        };

        this.info('Telegram message processed', meta);
    }

    logOCRProcess(result, duration) {
        const meta = {
            confidence: result.confidence,
            textLength: result.text.length,
            processingTime: duration,
            workerId: result.workerId
        };

        this.info('OCR processing completed', meta);
    }

    logBettingSlipAnalysis(analysis) {
        const meta = {
            isBettingSlip: analysis.isBettingSlip,
            selectionsCount: analysis.selections.length,
            hasRef: !!analysis.betRef,
            hasDate: !!analysis.matchDate,
            stake: analysis.stake,
            toReturn: analysis.toReturn,
            processingTime: analysis.metadata?.processingTime
        };

        this.info('Betting slip analysis completed', meta);
    }

    logAPIRequest(source, endpoint, duration, success, error = null) {
        const meta = {
            source,
            endpoint,
            duration,
            success,
            error: error?.message
        };

        if (success) {
            this.info('API request successful', meta);
        } else {
            this.warn('API request failed', meta);
        }
    }

    logCacheOperation(operation, key, hit = null) {
        const meta = {
            operation,
            key: key.substring(0, 50), // Truncate long keys
            hit
        };

        this.debug('Cache operation', meta);
    }

    // Performance tracking
    startPerformanceTimer(operation) {
        const startTime = Date.now();
        this.performanceTracker.set(operation, startTime);
        return startTime;
    }

    endPerformanceTimer(operation, meta = {}) {
        const startTime = this.performanceTracker.get(operation);
        if (!startTime) {
            this.warn('Performance timer not found', { operation });
            return 0;
        }

        const duration = Date.now() - startTime;
        this.performanceTracker.delete(operation);

        this.info('Performance metric', {
            operation,
            duration,
            ...meta
        });

        return duration;
    }

    // Error tracking
    logError(error, context = {}) {
        const errorMeta = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            context
        };

        this.error('Application error', errorMeta);
    }

    // System metrics
    logSystemMetrics() {
        const metrics = {
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
        };

        this.debug('System metrics', metrics);
    }

    // Event emitter functionality
    emit(event, data) {
        // Simple event emitter implementation
        if (this.listeners && this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in log event listener:', error);
                }
            });
        }
    }

    on(event, callback) {
        if (!this.listeners) this.listeners = {};
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    // Cleanup
    shutdown() {
        if (this.enableFile) {
            this.info('Logging service shutting down');
        }
        
        // Clear performance tracker
        this.performanceTracker.clear();
        
        console.log('✅ Logging service shutdown');
    }
}

module.exports = new LoggingService();
/**
 * Environment Configuration Management
 * Centralized configuration with validation and secure defaults
 */

require('dotenv').config();

class EnvironmentConfig {
    constructor() {
        this.config = {
            // Telegram Bot Configuration
            telegram: {
                token: this.getRequired('TELEGRAM_BOT_TOKEN'),
                polling: {
                    interval: parseInt(process.env.TELEGRAM_POLLING_INTERVAL) || 1000,
                    timeout: parseInt(process.env.TELEGRAM_POLLING_TIMEOUT) || 30000
                }
            },

            // API Keys
            apis: {
                football: process.env.FOOTBALL_API_KEY || null,
                brave: process.env.BRAVE_API_KEY || 'BSA7DmfCgYe3E72WqMVdkuZmkj51W3v'
            },

            // OCR Configuration
            ocr: {
                workerPoolSize: parseInt(process.env.OCR_WORKER_POOL_SIZE) || 3,
                timeout: parseInt(process.env.OCR_TIMEOUT) || 30000,
                maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE_MB) || 10,
                tesseractConfig: {
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789£.:/- ',
                    tessedit_pageseg_mode: '6',
                    preserve_interword_spaces: '1'
                }
            },

            // Caching Configuration
            cache: {
                enabled: process.env.CACHE_ENABLED !== 'false',
                ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES) || 60,
                maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES) || 1000
            },

            // Rate Limiting
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30
            },

            // Logging
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                enableConsole: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
                enableFile: process.env.ENABLE_FILE_LOGGING === 'true'
            },

            // Performance
            performance: {
                concurrentProcessing: parseInt(process.env.CONCURRENT_PROCESSING) || 2,
                requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000
            }
        };

        this.validate();
    }

    getRequired(key) {
        const value = process.env[key];
        if (!value || value.trim() === '') {
            throw new Error(`❌ Required environment variable ${key} is not set`);
        }
        return value.trim();
    }

    validate() {
        // Validate token format
        const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
        if (!tokenPattern.test(this.config.telegram.token)) {
            console.warn('⚠️ Telegram token format looks incorrect');
        }

        // Validate numeric ranges
        if (this.config.ocr.workerPoolSize < 1 || this.config.ocr.workerPoolSize > 10) {
            throw new Error('OCR worker pool size must be between 1 and 10');
        }

        if (this.config.ocr.maxImageSize > 50) {
            console.warn('⚠️ Max image size > 50MB may cause memory issues');
        }

        console.log('✅ Environment configuration validated');
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }

    isDevelopment() {
        return process.env.NODE_ENV === 'development';
    }

    isProduction() {
        return process.env.NODE_ENV === 'production';
    }
}

module.exports = new EnvironmentConfig();
/**
 * Refactored Telegram Bot Implementation
 * Modular architecture with proper error handling and service integration
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/environment');
const ocrWorkerPool = require('../services/ocrWorkerPool');
const bettingSlipAnalyzer = require('../services/bettingSlipAnalyzer');
const matchResultService = require('../services/matchResultService');
const validationService = require('../services/validationService');
const logger = require('../services/loggingService');
const cacheService = require('../services/cacheService');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.isInitialized = false;
        this.isShuttingDown = false;
        
        // Rate limiting
        this.userRequests = new Map();
        this.rateLimitWindow = config.get('rateLimit.windowMs');
        this.maxRequestsPerWindow = config.get('rateLimit.maxRequests');
        
        // Stats tracking
        this.stats = {
            messagesProcessed: 0,
            imagesProcessed: 0,
            bettingSlipsAnalyzed: 0,
            errors: 0,
            uptime: Date.now()
        };
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            logger.info('Initializing Telegram bot service...');
            
            // Initialize OCR worker pool
            await ocrWorkerPool.initialize();
            
            // Initialize Telegram bot
            const token = config.get('telegram.token');
            this.bot = new TelegramBot(token, { 
                polling: {
                    interval: config.get('telegram.polling.interval'),
                    params: {
                        timeout: config.get('telegram.polling.timeout') / 1000 // Convert to seconds
                    }
                }
            });

            this.setupEventHandlers();
            this.setupCommands();
            this.setupErrorHandling();

            // Set up cleanup on process termination
            process.on('SIGINT', () => this.shutdown());
            process.on('SIGTERM', () => this.shutdown());
            
            this.isInitialized = true;
            logger.info('Telegram bot service initialized successfully');
            
        } catch (error) {
            logger.logError(error, { operation: 'bot_initialization' });
            throw error;
        }
    }

    setupEventHandlers() {
        // Photo messages
        this.bot.on('photo', async (msg) => {
            await this.handleImageMessage(msg, 'photo');
        });

        // Document messages (images)
        this.bot.on('document', async (msg) => {
            if (msg.document.mime_type && msg.document.mime_type.startsWith('image/')) {
                await this.handleImageMessage(msg, 'document');
            }
        });

        // Text messages
        this.bot.on('message', (msg) => {
            if (!msg.photo && !msg.document && msg.text) {
                logger.logTelegramMessage(msg, 'text_received');
                this.stats.messagesProcessed++;
            }
        });
    }

    setupCommands() {
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            logger.logTelegramMessage(msg, 'start_command');
            
            const welcomeMessage = `🤖 **Welcome to OCR Betting Slip Bot!**

📷 Send me a betting slip image and I'll analyze it for you.

**What I can do:**
• Extract text from betting slip images using OCR
• Parse betting selections and odds
• Fetch match results from multiple sources
• Calculate win/loss outcomes

**Commands:**
/start - Show this welcome message
/ping - Test if bot is working
/stats - Show bot statistics
/help - Get help and tips

Just send any betting slip image to get started!`;

            await this.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        });

        // Ping command
        this.bot.onText(/\/ping/, async (msg) => {
            const chatId = msg.chat.id;
            logger.logTelegramMessage(msg, 'ping_command');
            
            const uptime = Math.floor((Date.now() - this.stats.uptime) / 1000);
            await this.sendMessage(chatId, `🏓 Pong! Bot is working.\n\n⏱️ Uptime: ${uptime} seconds`);
        });

        // Stats command
        this.bot.onText(/\/stats/, async (msg) => {
            const chatId = msg.chat.id;
            logger.logTelegramMessage(msg, 'stats_command');
            
            const ocrStats = ocrWorkerPool.getStats();
            const cacheStats = cacheService.getStats();
            const matchStats = matchResultService.getStats();
            
            const statsMessage = `📊 **Bot Statistics**

**Processing:**
• Messages processed: ${this.stats.messagesProcessed}
• Images processed: ${this.stats.imagesProcessed}
• Betting slips analyzed: ${this.stats.bettingSlipsAnalyzed}
• Errors: ${this.stats.errors}

**OCR Performance:**
• Worker pool size: ${ocrStats.poolSize}
• Available workers: ${ocrStats.availableWorkers}
• Tasks processed: ${ocrStats.processed}
• Tasks failed: ${ocrStats.failed}
• Avg processing time: ${ocrStats.avgProcessingTime.toFixed(0)}ms

**Cache Performance:**
• Hit rate: ${cacheStats.hitRate}
• Cache entries: ${cacheStats.size}/${cacheStats.maxEntries}
• Total hits: ${cacheStats.hits}
• Total misses: ${cacheStats.misses}

**Match Results:**
• API requests: ${matchStats.requests}
• Cache hit rate: ${matchStats.hitRate}
• Avg response time: ${matchStats.avgResponseTime.toFixed(0)}ms`;

            await this.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
        });

        // Help command
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            logger.logTelegramMessage(msg, 'help_command');
            
            const helpMessage = `❓ **Help & Tips**

**For best OCR results:**
• Use high-quality images (clear and well-lit)
• Ensure text is not blurry or cut off
• Avoid images with excessive shadows or glare
• Portrait orientation works best for betting slips

**Supported formats:**
• Photos (JPEG, PNG)
• Document images (PNG, JPEG, GIF, BMP, WebP)
• Maximum file size: ${config.get('ocr.maxImageSize')}MB

**Troubleshooting:**
• If OCR fails, try a clearer image
• Results depend on image quality
• Some older betting slips may not be parsed correctly

**Privacy:**
• Images are processed temporarily and not stored
• No personal data is retained after processing`;

            await this.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        });
    }

    setupErrorHandling() {
        this.bot.on('polling_error', (error) => {
            logger.logError(error, { operation: 'telegram_polling' });
        });

        this.bot.on('webhook_error', (error) => {
            logger.logError(error, { operation: 'telegram_webhook' });
        });
    }

    async handleImageMessage(msg, messageType) {
        const chatId = msg.chat.id;
        const messageId = msg.message_id;
        
        // Start performance timer
        const processingStart = logger.startPerformanceTimer(`image_processing_${messageId}`);
        
        try {
            logger.logTelegramMessage(msg, `image_${messageType}_received`);
            this.stats.imagesProcessed++;

            // Rate limiting check
            if (!this.checkRateLimit(msg.from.id)) {
                await this.sendMessage(chatId, 
                    '⚠️ Rate limit exceeded. Please wait before sending another image.',
                    { reply_to_message_id: messageId }
                );
                return;
            }

            // Validate message and image
            const messageValidation = validationService.validateTelegramMessage(msg);
            if (!messageValidation.isValid) {
                await this.handleValidationError(chatId, messageId, messageValidation);
                return;
            }

            const imageValidation = validationService.validateImageInput(msg);
            if (!imageValidation.isValid) {
                await this.handleValidationError(chatId, messageId, imageValidation);
                return;
            }

            // Send processing message
            await this.sendMessage(chatId, '🔄 Processing image with OCR...', {
                reply_to_message_id: messageId
            });

            // Download and process image
            const imageBuffer = await this.downloadImage(msg, messageType);
            const ocrResult = await ocrWorkerPool.processImage(imageBuffer);
            
            logger.logOCRProcess(ocrResult, ocrResult.processingTime);

            if (!ocrResult.text || ocrResult.text.trim().length === 0) {
                await this.sendMessage(chatId, '❌ No text found in this image', {
                    reply_to_message_id: messageId
                });
                return;
            }

            // Analyze betting slip
            const analysis = bettingSlipAnalyzer.analyze(ocrResult.text.trim());
            logger.logBettingSlipAnalysis(analysis);

            const analysisValidation = validationService.validateBettingSlipAnalysis(analysis);
            
            if (analysis.isBettingSlip && analysisValidation.isValid) {
                this.stats.bettingSlipsAnalyzed++;
                
                await this.sendMessage(chatId, '⚽ Checking match results...', {
                    reply_to_message_id: messageId
                });

                // Fetch match results with concurrent processing
                const concurrency = config.get('performance.concurrentProcessing');
                await matchResultService.fetchMatchResults(analysis.selections, concurrency);

                // Send final response
                const response = this.formatBettingSlipResponse(analysis, ocrResult.confidence, analysisValidation.quality);
                await this.sendMessage(chatId, response, {
                    parse_mode: 'Markdown',
                    reply_to_message_id: messageId
                });
                
            } else if (analysis.isBettingSlip) {
                // Low quality betting slip
                const response = this.formatLowQualityResponse(analysis, analysisValidation);
                await this.sendMessage(chatId, response, {
                    parse_mode: 'Markdown',
                    reply_to_message_id: messageId
                });
                
            } else {
                // Regular OCR result
                await this.sendMessage(chatId, 
                    `📝 *OCR Result:*\n\n\`\`\`\n${ocrResult.text.trim()}\n\`\`\`\n\n*Confidence:* ${ocrResult.confidence.toFixed(1)}%`, 
                    {
                        parse_mode: 'Markdown',
                        reply_to_message_id: messageId
                    }
                );
            }

        } catch (error) {
            this.stats.errors++;
            logger.logError(error, { 
                operation: 'image_processing',
                chatId,
                messageId,
                messageType 
            });

            await this.sendMessage(chatId, '❌ Error processing image. Please try again.', {
                reply_to_message_id: messageId
            });
        } finally {
            logger.endPerformanceTimer(`image_processing_${messageId}`, {
                chatId,
                messageType
            });
        }
    }

    async downloadImage(msg, messageType) {
        try {
            const fileId = messageType === 'photo' ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
            const file = await this.bot.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${config.get('telegram.token')}/${file.file_path}`;
            
            logger.debug('Downloading image', { fileId, fileSize: file.file_size });

            const https = require('https');
            return new Promise((resolve, reject) => {
                https.get(fileUrl, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download file: ${response.statusCode}`));
                        return;
                    }
                    
                    const chunks = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => resolve(Buffer.concat(chunks)));
                    response.on('error', reject);
                }).on('error', reject);
            });

        } catch (error) {
            logger.logError(error, { operation: 'image_download' });
            throw error;
        }
    }

    checkRateLimit(userId) {
        const now = Date.now();
        const userHistory = this.userRequests.get(userId) || [];
        
        // Remove old requests outside the window
        const recentRequests = userHistory.filter(timestamp => 
            now - timestamp < this.rateLimitWindow
        );
        
        // Check if under limit
        if (recentRequests.length >= this.maxRequestsPerWindow) {
            return false;
        }
        
        // Add current request
        recentRequests.push(now);
        this.userRequests.set(userId, recentRequests);
        
        return true;
    }

    async handleValidationError(chatId, messageId, validation) {
        const errorMessage = validationService.formatValidationErrors(validation);
        await this.sendMessage(chatId, errorMessage, {
            reply_to_message_id: messageId,
            parse_mode: 'Markdown'
        });
    }

    async sendMessage(chatId, text, options = {}) {
        try {
            return await this.bot.sendMessage(chatId, text, options);
        } catch (error) {
            logger.logError(error, { 
                operation: 'send_message',
                chatId,
                textLength: text.length 
            });
            throw error;
        }
    }

    formatBettingSlipResponse(analysis, ocrConfidence, quality) {
        let response = `🎯 *Betting Slip Analysis*\n\n`;
        
        // Quality indicator
        const qualityEmoji = {
            'high': '🟢',
            'medium': '🟡', 
            'low': '🟠',
            'very_low': '🔴'
        };
        
        response += `${qualityEmoji[quality] || '⚪'} *Analysis Quality:* ${quality}\n`;
        response += `🔍 *OCR Confidence:* ${ocrConfidence.toFixed(1)}%\n\n`;
        
        if (analysis.betRef) {
            response += `📋 *Bet Reference:* \`${analysis.betRef}\`\n`;
        }
        
        if (analysis.matchDate) {
            response += `📅 *Match Date:* ${analysis.matchDate}\n`;
        }
        
        if (analysis.betType && analysis.odds) {
            response += `🎲 *Bet Type:* ${analysis.betType} @ ${analysis.odds}\n`;
        }
        
        if (analysis.stake) {
            response += `💰 *Stake:* £${analysis.stake}\n`;
        }
        
        if (analysis.toReturn) {
            response += `💸 *To Return:* £${analysis.toReturn}\n`;
        }
        
        if (analysis.selections.length > 0) {
            response += `\n📊 *Selections (${analysis.selections.length}):*\n`;
            let winCount = 0;
            let lossCount = 0;
            
            analysis.selections.forEach((selection, index) => {
                let resultEmoji = '';
                let resultText = '';
                
                if (selection.result === 'win') {
                    resultEmoji = '✅';
                    resultText = ' *WIN*';
                    winCount++;
                } else if (selection.result === 'loss') {
                    resultEmoji = '❌';
                    resultText = ' *LOSS*';
                    lossCount++;
                } else if (selection.result === 'pending') {
                    resultEmoji = '⏳';
                    resultText = ' *PENDING*';
                } else if (selection.status === 'not_found') {
                    resultEmoji = '🔍';
                    resultText = ' *NO RESULT FOUND*';
                } else {
                    resultEmoji = '❓';
                    resultText = ' *UNKNOWN*';
                }
                
                response += `${index + 1}. ${resultEmoji} ${selection.team} @ ${selection.odds}${resultText}\n`;
                
                if (selection.market !== 'Unknown') {
                    response += `   📈 ${selection.market}`;
                }
                
                if (selection.score) {
                    response += ` - Score: ${selection.score}`;
                    if (selection.source) {
                        response += ` (${selection.source})`;
                    }
                }
                
                response += '\n';
            });
            
            if (winCount > 0 || lossCount > 0) {
                response += `\n📈 *Results Summary:* ${winCount}W - ${lossCount}L`;
                
                if (analysis.selections.length === winCount) {
                    response += ' 🎉 *WINNING BET!*';
                } else if (lossCount > 0) {
                    response += ' ❌ *LOSING BET*';
                }
            }
        }
        
        return response;
    }

    formatLowQualityResponse(analysis, validation) {
        let response = `🟠 *Low Quality Betting Slip Analysis*\n\n`;
        
        response += `⚠️ *Issues Found:*\n`;
        validation.errors.forEach(error => {
            response += `• ${error}\n`;
        });
        validation.warnings.forEach(warning => {
            response += `• ${warning}\n`;
        });
        
        response += `\n📊 *Partial Results:* ${analysis.selections.length} selections found\n`;
        
        if (analysis.selections.length > 0) {
            response += `\n*Selections:*\n`;
            analysis.selections.forEach((selection, index) => {
                response += `${index + 1}. ${selection.team} @ ${selection.odds || 'N/A'}\n`;
            });
        }
        
        response += `\n💡 *Tip:* Try a clearer image for better results.`;
        
        return response;
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        logger.info('Shutting down Telegram bot service...');
        
        try {
            if (this.bot) {
                await this.bot.stopPolling();
            }
            
            await ocrWorkerPool.shutdown();
            cacheService.shutdown();
            logger.shutdown();
            
            console.log('✅ Telegram bot service shutdown complete');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }

    getStats() {
        return {
            ...this.stats,
            isInitialized: this.isInitialized,
            uptimeSeconds: Math.floor((Date.now() - this.stats.uptime) / 1000)
        };
    }
}

module.exports = new TelegramBotService();
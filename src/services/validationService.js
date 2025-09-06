/**
 * Input Validation Service
 * Handles validation of inputs, file sizes, and error management
 */

const config = require('../config/environment');

class ValidationService {
    constructor() {
        this.maxImageSizeMB = config.get('ocr.maxImageSize');
        this.allowedMimeTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/bmp',
            'image/webp'
        ];

        this.telegramFileSizeLimitMB = 20; // Telegram's limit
    }

    validateImageInput(msg) {
        const validation = {
            isValid: false,
            errors: [],
            warnings: [],
            fileInfo: null
        };

        try {
            // Check if message has photo or document
            let fileInfo = null;
            
            if (msg.photo && msg.photo.length > 0) {
                const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
                fileInfo = {
                    fileId: photo.file_id,
                    fileSize: photo.file_size,
                    type: 'photo',
                    mimeType: 'image/jpeg', // Default for photos
                    dimensions: {
                        width: photo.width,
                        height: photo.height
                    }
                };
            } else if (msg.document) {
                const doc = msg.document;
                fileInfo = {
                    fileId: doc.file_id,
                    fileSize: doc.file_size,
                    type: 'document',
                    mimeType: doc.mime_type,
                    fileName: doc.file_name
                };
            }

            if (!fileInfo) {
                validation.errors.push('No image found in message');
                return validation;
            }

            validation.fileInfo = fileInfo;

            // Validate file size
            const fileSizeMB = fileInfo.fileSize ? fileInfo.fileSize / (1024 * 1024) : 0;
            
            if (fileInfo.fileSize && fileSizeMB > this.telegramFileSizeLimitMB) {
                validation.errors.push(`File size (${fileSizeMB.toFixed(1)}MB) exceeds Telegram limit (${this.telegramFileSizeLimitMB}MB)`);
            } else if (fileInfo.fileSize && fileSizeMB > this.maxImageSizeMB) {
                validation.errors.push(`File size (${fileSizeMB.toFixed(1)}MB) exceeds limit (${this.maxImageSizeMB}MB)`);
            } else if (fileSizeMB > 5) {
                validation.warnings.push(`Large file size (${fileSizeMB.toFixed(1)}MB) may take longer to process`);
            }

            // Validate MIME type for documents
            if (fileInfo.type === 'document') {
                if (!fileInfo.mimeType) {
                    validation.warnings.push('Unknown file type - processing may fail');
                } else if (!this.allowedMimeTypes.includes(fileInfo.mimeType)) {
                    validation.errors.push(`Unsupported file type: ${fileInfo.mimeType}. Supported types: ${this.allowedMimeTypes.join(', ')}`);
                }
            }

            // Validate image dimensions for photos
            if (fileInfo.type === 'photo' && fileInfo.dimensions) {
                const { width, height } = fileInfo.dimensions;
                
                if (width < 100 || height < 100) {
                    validation.warnings.push('Image resolution is very low - OCR accuracy may be reduced');
                } else if (width > 4000 || height > 4000) {
                    validation.warnings.push('Very high resolution image - processing may take longer');
                }

                // Check aspect ratio for betting slips (usually portrait)
                const aspectRatio = width / height;
                if (aspectRatio > 2 || aspectRatio < 0.3) {
                    validation.warnings.push('Unusual image aspect ratio for a betting slip');
                }
            }

            validation.isValid = validation.errors.length === 0;
            return validation;

        } catch (error) {
            validation.errors.push(`Validation error: ${error.message}`);
            return validation;
        }
    }

    validateTelegramMessage(msg) {
        const validation = {
            isValid: false,
            errors: [],
            warnings: [],
            messageInfo: null
        };

        try {
            if (!msg) {
                validation.errors.push('Message is null or undefined');
                return validation;
            }

            if (!msg.chat || !msg.chat.id) {
                validation.errors.push('Message missing chat information');
                return validation;
            }

            if (!msg.message_id) {
                validation.errors.push('Message missing message ID');
                return validation;
            }

            // Extract message metadata
            validation.messageInfo = {
                chatId: msg.chat.id,
                messageId: msg.message_id,
                chatType: msg.chat.type,
                userId: msg.from?.id,
                username: msg.from?.username,
                timestamp: msg.date,
                hasPhoto: !!(msg.photo && msg.photo.length > 0),
                hasDocument: !!msg.document,
                messageType: this.determineMessageType(msg)
            };

            // Validate chat type (ensure it's not a channel or unsupported type)
            const supportedChatTypes = ['private', 'group', 'supergroup'];
            if (!supportedChatTypes.includes(msg.chat.type)) {
                validation.warnings.push(`Unsupported chat type: ${msg.chat.type}`);
            }

            // Check for potential bot spam/flood
            if (msg.date) {
                const messageAge = Date.now() / 1000 - msg.date;
                if (messageAge > 300) { // 5 minutes old
                    validation.warnings.push('Processing old message - results may be cached');
                }
            }

            validation.isValid = validation.errors.length === 0;
            return validation;

        } catch (error) {
            validation.errors.push(`Message validation error: ${error.message}`);
            return validation;
        }
    }

    determineMessageType(msg) {
        if (msg.photo && msg.photo.length > 0) return 'photo';
        if (msg.document && msg.document.mime_type?.startsWith('image/')) return 'image_document';
        if (msg.text) return 'text';
        return 'other';
    }

    validateBettingSlipAnalysis(analysis) {
        const validation = {
            isValid: false,
            errors: [],
            warnings: [],
            quality: 'unknown'
        };

        try {
            if (!analysis) {
                validation.errors.push('Analysis is null or undefined');
                return validation;
            }

            // Check if it's identified as a betting slip
            if (!analysis.isBettingSlip) {
                validation.warnings.push('Content not identified as a betting slip');
                validation.quality = 'not_betting_slip';
                validation.isValid = true; // Still valid, just not a betting slip
                return validation;
            }

            // Validate selections
            if (!analysis.selections || analysis.selections.length === 0) {
                validation.errors.push('No betting selections found');
                validation.quality = 'no_selections';
                return validation;
            }

            // Check selection quality
            let validSelections = 0;
            let selectionsWithOpponents = 0;
            let selectionsWithOdds = 0;

            for (const selection of analysis.selections) {
                if (selection.team && selection.team.length > 1) {
                    validSelections++;
                }
                if (selection.opponent) {
                    selectionsWithOpponents++;
                }
                if (selection.odds && selection.odds > 0) {
                    selectionsWithOdds++;
                }
            }

            const totalSelections = analysis.selections.length;
            const validPercentage = (validSelections / totalSelections) * 100;
            const opponentPercentage = (selectionsWithOpponents / totalSelections) * 100;
            const oddsPercentage = (selectionsWithOdds / totalSelections) * 100;

            // Determine quality based on completeness
            if (validPercentage >= 90 && oddsPercentage >= 90 && opponentPercentage >= 70) {
                validation.quality = 'high';
            } else if (validPercentage >= 70 && oddsPercentage >= 70) {
                validation.quality = 'medium';
            } else if (validPercentage >= 50) {
                validation.quality = 'low';
            } else {
                validation.quality = 'very_low';
                validation.errors.push('Too many invalid selections found');
            }

            // Add specific warnings
            if (opponentPercentage < 50) {
                validation.warnings.push('Many selections missing opponent information');
            }
            if (oddsPercentage < 80) {
                validation.warnings.push('Some selections missing odds information');
            }
            if (!analysis.betRef) {
                validation.warnings.push('Bet reference not found');
            }
            if (!analysis.matchDate) {
                validation.warnings.push('Match date not extracted');
            }

            // Check for suspicious patterns
            if (totalSelections > 20) {
                validation.warnings.push('Unusually high number of selections - may indicate parsing errors');
            }
            if (totalSelections < 1) {
                validation.errors.push('No valid selections found');
            }

            validation.isValid = validation.errors.length === 0;
            return validation;

        } catch (error) {
            validation.errors.push(`Analysis validation error: ${error.message}`);
            return validation;
        }
    }

    validateApiResponse(response, source) {
        const validation = {
            isValid: false,
            errors: [],
            warnings: []
        };

        try {
            if (!response) {
                validation.errors.push(`${source}: No response received`);
                return validation;
            }

            // Check required fields based on source
            switch (source) {
                case 'Football API':
                    if (!response.homeTeam || !response.awayTeam) {
                        validation.errors.push('Missing team information');
                    }
                    if (!response.score) {
                        validation.warnings.push('Missing score information');
                    }
                    break;

                default:
                    // Generic validation
                    if (!response.homeTeam && !response.awayTeam && !response.score) {
                        validation.errors.push('Response appears to be empty');
                    }
            }

            // Validate score format if present
            if (response.score && !this.isValidScore(response.score)) {
                validation.errors.push(`Invalid score format: ${response.score}`);
            }

            // Check confidence level
            if (response.confidence) {
                const validConfidenceLevels = ['very_high', 'high', 'medium', 'low', 'very_low'];
                if (!validConfidenceLevels.includes(response.confidence)) {
                    validation.warnings.push(`Unknown confidence level: ${response.confidence}`);
                }
            }

            validation.isValid = validation.errors.length === 0;
            return validation;

        } catch (error) {
            validation.errors.push(`API response validation error: ${error.message}`);
            return validation;
        }
    }

    isValidScore(score) {
        const scorePattern = /^(\d{1,2})-(\d{1,2})$/;
        const match = score.match(scorePattern);
        
        if (!match) return false;
        
        const homeScore = parseInt(match[1]);
        const awayScore = parseInt(match[2]);
        
        return homeScore >= 0 && homeScore <= 20 && awayScore >= 0 && awayScore <= 20;
    }

    formatValidationErrors(validation) {
        let message = '';
        
        if (validation.errors.length > 0) {
            message += '❌ **Errors:**\n';
            validation.errors.forEach(error => {
                message += `  • ${error}\n`;
            });
        }
        
        if (validation.warnings.length > 0) {
            message += '⚠️ **Warnings:**\n';
            validation.warnings.forEach(warning => {
                message += `  • ${warning}\n`;
            });
        }
        
        return message;
    }
}

module.exports = new ValidationService();
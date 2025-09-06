/**
 * End-to-end tests for Telegram bot functionality
 * Tests complete user interaction flows
 */

const nock = require('nock');
const TelegramBot = require('node-telegram-bot-api');

// Mock Telegram Bot API
jest.mock('node-telegram-bot-api');

// Mock Tesseract OCR
jest.mock('tesseract.js', () => ({
    createWorker: jest.fn(() => ({
        setParameters: jest.fn(),
        recognize: jest.fn(),
        terminate: jest.fn()
    }))
}));

// Mock file system operations
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn(() => true)
}));

// Mock HTTPS for file downloads
jest.mock('https', () => ({
    get: jest.fn((url, callback) => {
        const mockResponse = {
            statusCode: 200,
            on: jest.fn((event, handler) => {
                if (event === 'data') {
                    handler(Buffer.from('mock image data'));
                } else if (event === 'end') {
                    handler();
                }
            })
        };
        callback(mockResponse);
        return { on: jest.fn() };
    })
}));

const testFixtures = require('../fixtures/betting-slips');
const matchFixtures = require('../fixtures/match-results');

describe('Telegram Bot E2E Tests', () => {
    let mockBot;
    let mockTesseractWorker;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock Telegram bot
        mockBot = {
            onText: jest.fn(),
            on: jest.fn(),
            sendMessage: jest.fn(),
            getFile: jest.fn(),
            polling: false
        };
        TelegramBot.mockImplementation(() => mockBot);

        // Setup mock Tesseract worker
        mockTesseractWorker = {
            setParameters: jest.fn(),
            recognize: jest.fn(),
            terminate: jest.fn()
        };
        require('tesseract.js').createWorker.mockResolvedValue(mockTesseractWorker);

        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Bot Initialization', () => {
        test('should initialize bot with correct token', () => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            
            // Require the bot after setting environment
            delete require.cache[require.resolve('../../bot.js')];
            
            expect(() => {
                require('../../bot.js');
            }).not.toThrow();
            
            expect(TelegramBot).toHaveBeenCalledWith('test_token_123', { polling: true });
        });

        test('should handle missing bot token gracefully', () => {
            const originalToken = process.env.TELEGRAM_BOT_TOKEN;
            delete process.env.TELEGRAM_BOT_TOKEN;

            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            try {
                delete require.cache[require.resolve('../../bot.js')];
                require('../../bot.js');
                
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    expect.stringContaining('TELEGRAM_BOT_TOKEN environment variable is required')
                );
                expect(mockExit).toHaveBeenCalledWith(1);
            } finally {
                mockExit.mockRestore();
                consoleErrorSpy.mockRestore();
                if (originalToken) process.env.TELEGRAM_BOT_TOKEN = originalToken;
            }
        });
    });

    describe('Command Handling', () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            process.env.FOOTBALL_API_KEY = 'test_api_key';
            
            delete require.cache[require.resolve('../../bot.js')];
            require('../../bot.js');
        });

        test('should handle /start command', () => {
            expect(mockBot.onText).toHaveBeenCalledWith(
                /\/start/,
                expect.any(Function)
            );

            // Simulate /start command
            const startHandler = mockBot.onText.mock.calls.find(
                call => call[0].toString().includes('start')
            )[1];

            const mockMsg = { chat: { id: 12345 } };
            startHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                expect.stringContaining('Welcome to OCR Bot!')
            );
        });

        test('should handle /ping command', () => {
            expect(mockBot.onText).toHaveBeenCalledWith(
                /\/ping/,
                expect.any(Function)
            );

            const pingHandler = mockBot.onText.mock.calls.find(
                call => call[0].toString().includes('ping')
            )[1];

            const mockMsg = { chat: { id: 12345 } };
            pingHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '🏓 Pong! Bot is working.'
            );
        });
    });

    describe('Image Processing Workflow', () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            process.env.FOOTBALL_API_KEY = 'test_api_key';
            
            delete require.cache[require.resolve('../../bot.js')];
            require('../../bot.js');
        });

        test('should process photo message with valid betting slip', async () => {
            // Setup OCR mock to return valid betting slip text
            mockTesseractWorker.recognize.mockResolvedValue({
                data: {
                    text: testFixtures.validMultipleSelections.ocrText,
                    confidence: 85
                }
            });

            // Setup API mocks for match results
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, matchFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, matchFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth);

            // Mock bot.getFile
            mockBot.getFile.mockResolvedValue({
                file_path: 'photos/test_image.jpg'
            });

            // Get the photo handler
            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                photo: [
                    { file_id: 'photo_file_id_123', width: 800, height: 600 }
                ]
            };

            await photoHandler(mockMsg);

            // Should send processing message
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '🔄 Processing image with OCR...',
                { reply_to_message_id: 67890 }
            );

            // Should send match results message
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '⚽ Checking match results...',
                { reply_to_message_id: 67890 }
            );

            // Should send final betting slip analysis
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                expect.stringContaining('🎯 *Betting Slip Analysis*'),
                expect.objectContaining({
                    parse_mode: 'Markdown',
                    reply_to_message_id: 67890
                })
            );
        });

        test('should handle OCR failure gracefully', async () => {
            mockTesseractWorker.recognize.mockResolvedValue({
                data: {
                    text: '',
                    confidence: 0
                }
            });

            mockBot.getFile.mockResolvedValue({
                file_path: 'photos/test_image.jpg'
            });

            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                photo: [{ file_id: 'photo_file_id_123' }]
            };

            await photoHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '❌ No text found in this image',
                { reply_to_message_id: 67890 }
            );
        });

        test('should handle non-betting slip images', async () => {
            mockTesseractWorker.recognize.mockResolvedValue({
                data: {
                    text: testFixtures.notBettingSlip.ocrText,
                    confidence: 90
                }
            });

            mockBot.getFile.mockResolvedValue({
                file_path: 'photos/test_image.jpg'
            });

            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                photo: [{ file_id: 'photo_file_id_123' }]
            };

            await photoHandler(mockMsg);

            // Should return OCR result for non-betting slip
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                expect.stringContaining('📝 *OCR Result:*'),
                expect.objectContaining({
                    parse_mode: 'Markdown',
                    reply_to_message_id: 67890
                })
            );
        });
    });

    describe('Document Processing', () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            process.env.FOOTBALL_API_KEY = 'test_api_key';
            
            delete require.cache[require.resolve('../../bot.js')];
            require('../../bot.js');
        });

        test('should process document with image mime type', async () => {
            mockTesseractWorker.recognize.mockResolvedValue({
                data: {
                    text: testFixtures.validSingleSelection.ocrText,
                    confidence: 88
                }
            });

            mockBot.getFile.mockResolvedValue({
                file_path: 'documents/test_document.png'
            });

            const documentHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'document'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                document: {
                    file_id: 'document_file_id_123',
                    mime_type: 'image/png'
                }
            };

            await documentHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '🔄 Processing document image with OCR...',
                { reply_to_message_id: 67890 }
            );
        });

        test('should ignore non-image documents', async () => {
            const documentHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'document'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                document: {
                    file_id: 'document_file_id_123',
                    mime_type: 'application/pdf'
                }
            };

            await documentHandler(mockMsg);

            // Should not process non-image documents
            expect(mockBot.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            process.env.FOOTBALL_API_KEY = 'test_api_key';
            
            delete require.cache[require.resolve('../../bot.js')];
            require('../../bot.js');
        });

        test('should handle OCR processing errors', async () => {
            mockTesseractWorker.recognize.mockRejectedValue(
                new Error('OCR processing failed')
            );

            mockBot.getFile.mockResolvedValue({
                file_path: 'photos/test_image.jpg'
            });

            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                photo: [{ file_id: 'photo_file_id_123' }]
            };

            await photoHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '❌ Error processing image. Please try again.',
                { reply_to_message_id: 67890 }
            );
        });

        test('should handle file download errors', async () => {
            mockBot.getFile.mockRejectedValue(
                new Error('Failed to get file')
            );

            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            const mockMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                photo: [{ file_id: 'photo_file_id_123' }]
            };

            await photoHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '❌ Error processing image. Please try again.',
                { reply_to_message_id: 67890 }
            );
        });

        test('should handle polling errors gracefully', () => {
            const pollingErrorHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'polling_error'
            )[1];

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const mockError = new Error('Polling failed');
            pollingErrorHandler(mockError);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', mockError);

            consoleErrorSpy.mockRestore();
        });
    });

    describe('User Experience Flow', () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            process.env.FOOTBALL_API_KEY = 'test_api_key';
            
            delete require.cache[require.resolve('../../bot.js')];
            require('../../bot.js');
        });

        test('should provide complete user interaction flow', async () => {
            // Step 1: User sends /start
            const startHandler = mockBot.onText.mock.calls.find(
                call => call[0].toString().includes('start')
            )[1];

            const mockMsg = { chat: { id: 12345 } };
            startHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                expect.stringContaining('Welcome to OCR Bot!')
            );

            // Step 2: User sends betting slip image
            mockTesseractWorker.recognize.mockResolvedValue({
                data: {
                    text: testFixtures.validSingleSelection.ocrText,
                    confidence: 92
                }
            });

            // Mock successful API response
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Chelsea')
                .reply(200, matchFixtures.footballApiResponses.teamSearch.chelsea)
                .get('/teams?search=Arsenal')
                .reply(200, { response: [{ team: { id: 42, name: 'Arsenal' } }] })
                .get(/\/fixtures.*team=49.*/)
                .reply(200, matchFixtures.footballApiResponses.fixtures.chelseaVsArsenal);

            mockBot.getFile.mockResolvedValue({
                file_path: 'photos/betting_slip.jpg'
            });

            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            const imageMsg = {
                chat: { id: 12345 },
                message_id: 67890,
                photo: [{ file_id: 'betting_slip_123' }]
            };

            await photoHandler(imageMsg);

            // Should have sent processing updates and final result
            const sendMessageCalls = mockBot.sendMessage.mock.calls;
            
            // Check for processing message
            expect(sendMessageCalls.some(call => 
                call[1].includes('Processing image with OCR')
            )).toBe(true);

            // Check for results checking message
            expect(sendMessageCalls.some(call => 
                call[1].includes('Checking match results')
            )).toBe(true);

            // Check for final analysis
            expect(sendMessageCalls.some(call => 
                call[1].includes('Betting Slip Analysis') && 
                call[2].parse_mode === 'Markdown'
            )).toBe(true);
        });

        test('should handle user sending /ping for health check', () => {
            const pingHandler = mockBot.onText.mock.calls.find(
                call => call[0].toString().includes('ping')
            )[1];

            const mockMsg = { chat: { id: 12345 } };
            pingHandler(mockMsg);

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                12345,
                '🏓 Pong! Bot is working.'
            );
        });
    });

    describe('Performance Under Load', () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';
            process.env.FOOTBALL_API_KEY = 'test_api_key';
            
            delete require.cache[require.resolve('../../bot.js')];
            require('../../bot.js');
        });

        test('should handle multiple simultaneous image uploads', async () => {
            const photoHandler = mockBot.on.mock.calls.find(
                call => call[0] === 'photo'
            )[1];

            // Setup mocks for concurrent processing
            mockTesseractWorker.recognize.mockResolvedValue({
                data: {
                    text: testFixtures.validSingleSelection.ocrText,
                    confidence: 85
                }
            });

            mockBot.getFile.mockResolvedValue({
                file_path: 'photos/test_image.jpg'
            });

            // Simulate 10 concurrent image uploads
            const concurrentUploads = Array.from({ length: 10 }, (_, i) => ({
                chat: { id: 12345 + i },
                message_id: 67890 + i,
                photo: [{ file_id: `photo_${i}` }]
            }));

            const startTime = Date.now();
            
            const promises = concurrentUploads.map(msg => photoHandler(msg));
            await Promise.allSettled(promises);
            
            const processingTime = Date.now() - startTime;

            expect(processingTime).toBeLessThan(30000); // Should handle within 30 seconds
            expect(mockBot.sendMessage.mock.calls.length).toBeGreaterThan(10); // Should have sent responses
        });
    });
});
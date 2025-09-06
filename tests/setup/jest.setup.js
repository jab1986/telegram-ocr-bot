/**
 * Jest Setup Configuration
 * Global test setup and configuration
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token_123456789';
process.env.FOOTBALL_API_KEY = 'test_football_api_key';
process.env.BRAVE_API_KEY = 'test_brave_api_key';

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies by default
jest.mock('tesseract.js', () => ({
    createWorker: jest.fn(() => ({
        setParameters: jest.fn(),
        recognize: jest.fn(),
        terminate: jest.fn()
    }))
}));

jest.mock('node-telegram-bot-api', () => {
    return jest.fn().mockImplementation(() => ({
        onText: jest.fn(),
        on: jest.fn(),
        sendMessage: jest.fn(),
        getFile: jest.fn(),
        polling: false
    }));
});

// Global console methods for test debugging
global.testLogger = {
    debug: process.env.TEST_DEBUG ? console.log : () => {},
    info: console.log,
    warn: console.warn,
    error: console.error
};

// Clean up between tests
beforeEach(() => {
    jest.clearAllMocks();
});

// Global test utilities
global.createMockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
});

global.createMockMatch = (homeTeam, awayTeam, score, winner = 'HOME') => ({
    homeTeam,
    awayTeam,
    score,
    winner,
    status: 'FINISHED',
    source: 'Test',
    confidence: 'high'
});

// Performance monitoring for tests
global.performanceTracker = {
    start: (name) => {
        global._perfStart = global._perfStart || {};
        global._perfStart[name] = Date.now();
    },
    end: (name) => {
        if (global._perfStart && global._perfStart[name]) {
            const duration = Date.now() - global._perfStart[name];
            global.testLogger.debug(`Performance: ${name} took ${duration}ms`);
            return duration;
        }
        return 0;
    }
};
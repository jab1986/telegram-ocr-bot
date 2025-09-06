/**
 * Integration tests for complete betting slip analysis workflow
 * Tests end-to-end flow from OCR to match results
 */

const nock = require('nock');
const bettingSlipAnalyzer = require('../../src/services/bettingSlipAnalyzer');
const matchResultService = require('../../src/services/matchResultService');
const testFixtures = require('../fixtures/betting-slips');
const matchFixtures = require('../fixtures/match-results');

// Mock the cache service
jest.mock('../../src/services/cacheService', () => ({
    getMatchResult: jest.fn(),
    cacheMatchResult: jest.fn(),
    getTeamSearch: jest.fn(),
    cacheTeamSearch: jest.fn()
}));

const mockCacheService = require('../../src/services/cacheService');

describe('Betting Slip Analysis Workflow Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCacheService.getMatchResult.mockReturnValue(null);
        mockCacheService.getTeamSearch.mockReturnValue(null);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Complete Workflow: OCR -> Analysis -> Match Results', () => {
        test('should process complete betting slip workflow successfully', async () => {
            // Step 1: Analyze OCR text
            const analysis = bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);
            
            expect(analysis.isBettingSlip).toBe(true);
            expect(analysis.selections).toHaveLength(3);

            // Step 2: Mock API responses for match results
            nock('https://v3.football.api-sports.io')
                // Liverpool search
                .get('/teams?search=Liverpool')
                .reply(200, matchFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, matchFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth)
                
                // Tottenham search
                .get('/teams?search=Tottenham')
                .reply(200, { response: [{ team: { id: 47, name: 'Tottenham Hotspur' } }] })
                .get('/teams?search=Burnley')
                .reply(200, { response: [{ team: { id: 44, name: 'Burnley' } }] })
                .get(/\/fixtures.*team=47.*/)
                .reply(200, {
                    response: [{
                        fixture: { id: 123458, status: { short: 'FT' } },
                        teams: {
                            home: { id: 47, name: 'Tottenham Hotspur' },
                            away: { id: 44, name: 'Burnley' }
                        },
                        goals: { home: 2, away: 0 },
                        league: { name: 'Premier League' }
                    }]
                })
                
                // Barcelona search
                .get('/teams?search=Barcelona')
                .reply(200, { response: [{ team: { id: 529, name: 'FC Barcelona' } }] })
                .get('/teams?search=Vallecano')
                .reply(200, { response: [{ team: { id: 546, name: 'Rayo Vallecano' } }] })
                .get(/\/fixtures.*team=529.*/)
                .reply(200, {
                    response: [{
                        fixture: { id: 123459, status: { short: 'FT' } },
                        teams: {
                            home: { id: 529, name: 'FC Barcelona' },
                            away: { id: 546, name: 'Rayo Vallecano' }
                        },
                        goals: { home: 2, away: 1 },
                        league: { name: 'La Liga' }
                    }]
                });

            // Step 3: Fetch match results
            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            // Step 4: Verify complete workflow
            expect(resultsWithMatches).toHaveLength(3);

            // Liverpool should win (2-1)
            expect(resultsWithMatches[0].result).toBe('win');
            expect(resultsWithMatches[0].score).toBe('2-1');
            expect(resultsWithMatches[0].source).toBe('Football API');

            // Tottenham should win (2-0)
            expect(resultsWithMatches[1].result).toBe('win');
            expect(resultsWithMatches[1].score).toBe('2-0');

            // Barcelona should win (2-1)
            expect(resultsWithMatches[2].result).toBe('win');
            expect(resultsWithMatches[2].score).toBe('2-1');

            // All selections won - should be a winning bet
            const winCount = resultsWithMatches.filter(s => s.result === 'win').length;
            expect(winCount).toBe(3);
        });

        test('should handle mixed win/loss results correctly', async () => {
            const analysis = bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);

            // Mock mixed results: Liverpool wins, Tottenham loses, Barcelona wins
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, matchFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, matchFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth) // Liverpool wins 2-1
                
                .get('/teams?search=Tottenham')
                .reply(200, { response: [{ team: { id: 47, name: 'Tottenham Hotspur' } }] })
                .get('/teams?search=Burnley')
                .reply(200, { response: [{ team: { id: 44, name: 'Burnley' } }] })
                .get(/\/fixtures.*team=47.*/)
                .reply(200, {
                    response: [{
                        fixture: { id: 123458, status: { short: 'FT' } },
                        teams: {
                            home: { id: 47, name: 'Tottenham Hotspur' },
                            away: { id: 44, name: 'Burnley' }
                        },
                        goals: { home: 0, away: 2 }, // Tottenham loses 0-2
                        league: { name: 'Premier League' }
                    }]
                })
                
                .get('/teams?search=Barcelona')
                .reply(200, { response: [{ team: { id: 529, name: 'FC Barcelona' } }] })
                .get('/teams?search=Vallecano')
                .reply(200, { response: [{ team: { id: 546, name: 'Rayo Vallecano' } }] })
                .get(/\/fixtures.*team=529.*/)
                .reply(200, {
                    response: [{
                        fixture: { id: 123459, status: { short: 'FT' } },
                        teams: {
                            home: { id: 529, name: 'FC Barcelona' },
                            away: { id: 546, name: 'Rayo Vallecano' }
                        },
                        goals: { home: 3, away: 1 }, // Barcelona wins 3-1
                        league: { name: 'La Liga' }
                    }]
                });

            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            expect(resultsWithMatches[0].result).toBe('win');   // Liverpool wins
            expect(resultsWithMatches[1].result).toBe('loss');  // Tottenham loses
            expect(resultsWithMatches[2].result).toBe('win');   // Barcelona wins

            // Should be a losing bet overall (accumulator requires all wins)
            const lossCount = resultsWithMatches.filter(s => s.result === 'loss').length;
            expect(lossCount).toBeGreaterThan(0);
        });

        test('should handle API failures with graceful fallback', async () => {
            const analysis = bettingSlipAnalyzer.analyze(testFixtures.validSingleSelection.ocrText);

            // Mock Football API failure
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Chelsea')
                .reply(500, { error: 'Internal Server Error' });

            // Mock Goal.com fallback success
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, matchFixtures.goalComResponses.chelseaMatch);

            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            expect(resultsWithMatches).toHaveLength(1);
            // Should still get result from fallback source
            expect(resultsWithMatches[0].result).toBeDefined();
        });
    });

    describe('Performance Integration Tests', () => {
        test('should handle large betting slip efficiently', async () => {
            // Create large betting slip
            const largeBettingSlip = `Bet Ref LARGE123
${Array.from({ length: 15 }, (_, i) => `
Team${i}
${(Math.random() * 5 + 1).toFixed(2)}
Full Time Result
Team${i} v Opponent${i}
`).join('')}
15 Fold 1000.00
Stake £10.00
To Return £10000.00`;

            const startTime = Date.now();

            // Step 1: Analyze
            const analysis = bettingSlipAnalyzer.analyze(largeBettingSlip);

            // Step 2: Mock API responses (all failures to test performance)
            for (let i = 0; i < 15; i++) {
                nock('https://v3.football.api-sports.io')
                    .get(`/teams?search=Team${i}`)
                    .reply(404, { response: [] });
            }

            // Step 3: Fetch results
            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections, 5);

            const totalTime = Date.now() - startTime;

            expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds
            expect(resultsWithMatches).toHaveLength(15);
            expect(analysis.selections).toHaveLength(15);
        });

        test('should maintain performance under concurrent load', async () => {
            const concurrentBettingSlips = Array.from({ length: 5 }, (_, i) => 
                testFixtures.validSingleSelection.ocrText.replace('Chelsea', `Team${i}`)
            );

            // Mock all API calls to fail quickly
            for (let i = 0; i < 5; i++) {
                nock('https://v3.football.api-sports.io')
                    .get(`/teams?search=Team${i}`)
                    .reply(404, { response: [] });
            }

            const startTime = Date.now();

            const promises = concurrentBettingSlips.map(async (ocrText) => {
                const analysis = bettingSlipAnalyzer.analyze(ocrText);
                return await matchResultService.fetchMatchResults(analysis.selections);
            });

            const results = await Promise.all(promises);
            const totalTime = Date.now() - startTime;

            expect(totalTime).toBeLessThan(15000); // Should handle concurrency well
            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result).toHaveLength(1);
            });
        });
    });

    describe('Edge Cases Integration', () => {
        test('should handle betting slip with unknown teams gracefully', async () => {
            const unknownTeamSlip = `Bet Ref UNKNOWN123
UnknownTeamA
1.50
Full Time Result
UnknownTeamA v UnknownTeamB
Single 1.50
Stake £10.00`;

            const analysis = bettingSlipAnalyzer.analyze(unknownTeamSlip);
            expect(analysis.isBettingSlip).toBe(true);

            // Mock API returning no results
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=UnknownTeamA')
                .reply(200, { response: [] });

            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            expect(resultsWithMatches).toHaveLength(1);
            expect(resultsWithMatches[0].result).toBe('unknown');
            expect(resultsWithMatches[0].status).toBe('not_found');
        });

        test('should handle Yes/No markets with missing fixture info', async () => {
            const analysis = bettingSlipAnalyzer.analyze(testFixtures.validYesNoMarket.ocrText);
            
            // Mock API failures for Yes/No selections (they won't have team IDs)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Yes')
                .reply(200, { response: [] })
                .get('/teams?search=No')
                .reply(200, { response: [] });

            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            expect(resultsWithMatches).toHaveLength(2);
            // Yes/No selections should be handled gracefully even without team matches
            resultsWithMatches.forEach(result => {
                expect(result.result).toBeDefined();
            });
        });
    });

    describe('Data Consistency Integration', () => {
        test('should maintain data integrity throughout workflow', async () => {
            const analysis = bettingSlipAnalyzer.analyze(testFixtures.validWithBoost.ocrText);

            // Verify initial analysis data
            expect(analysis.betRef).toBe('BOOST123');
            expect(analysis.boost).toBe(5.00);
            expect(analysis.stake).toBe(20.00);
            expect(analysis.toReturn).toBe(37.00);

            // Mock successful match result
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Manchester United')
                .reply(200, { response: [{ team: { id: 33, name: 'Manchester United' } }] })
                .get('/teams?search=Leeds')
                .reply(200, { response: [{ team: { id: 63, name: 'Leeds United' } }] })
                .get(/\/fixtures.*team=33.*/)
                .reply(200, {
                    response: [{
                        fixture: { id: 123460, status: { short: 'FT' } },
                        teams: {
                            home: { id: 33, name: 'Manchester United' },
                            away: { id: 63, name: 'Leeds United' }
                        },
                        goals: { home: 2, away: 1 },
                        league: { name: 'Premier League' }
                    }]
                });

            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            // Verify data integrity is maintained
            expect(resultsWithMatches[0].result).toBe('win');
            expect(resultsWithMatches[0].score).toBe('2-1');
            
            // Original analysis data should remain unchanged
            expect(analysis.betRef).toBe('BOOST123');
            expect(analysis.boost).toBe(5.00);
            expect(analysis.stake).toBe(20.00);
            expect(analysis.toReturn).toBe(37.00);
        });

        test('should handle partial API responses consistently', async () => {
            const analysis = bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);

            // Mock partial success: first team found, second not found, third found
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, matchFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, matchFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth)
                
                .get('/teams?search=Tottenham')
                .reply(500, { error: 'Server Error' })
                
                .get('/teams?search=Barcelona')
                .reply(200, { response: [{ team: { id: 529, name: 'FC Barcelona' } }] })
                .get('/teams?search=Vallecano')
                .reply(200, { response: [{ team: { id: 546, name: 'Rayo Vallecano' } }] })
                .get(/\/fixtures.*team=529.*/)
                .reply(200, {
                    response: [{
                        fixture: { id: 123459, status: { short: 'FT' } },
                        teams: {
                            home: { id: 529, name: 'FC Barcelona' },
                            away: { id: 546, name: 'Rayo Vallecano' }
                        },
                        goals: { home: 2, away: 1 },
                        league: { name: 'La Liga' }
                    }]
                });

            const resultsWithMatches = await matchResultService.fetchMatchResults(analysis.selections);

            expect(resultsWithMatches).toHaveLength(3);
            expect(resultsWithMatches[0].result).toBe('win');        // Liverpool success
            expect(resultsWithMatches[1].result).toBe('unknown');    // Tottenham failed
            expect(resultsWithMatches[2].result).toBe('win');        // Barcelona success

            // Should maintain consistent result structure even with partial failures
            resultsWithMatches.forEach(result => {
                expect(result).toHaveProperty('result');
                expect(result).toHaveProperty('status');
            });
        });
    });
});
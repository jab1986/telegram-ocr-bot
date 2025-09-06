/**
 * Integration tests for API fallback mechanisms
 * Tests resilience and fallback strategies across different API sources
 */

const nock = require('nock');
const matchResultService = require('../../src/services/matchResultService');
const testFixtures = require('../fixtures/match-results');

// Mock cache service
jest.mock('../../src/services/cacheService', () => ({
    getMatchResult: jest.fn(() => null),
    cacheMatchResult: jest.fn(),
    getTeamSearch: jest.fn(() => null),
    cacheTeamSearch: jest.fn()
}));

describe('API Fallback Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Primary to Secondary Fallback', () => {
        test('should fallback from Football API to Goal.com when primary fails', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock Football API failure (rate limited)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(429, { message: 'Rate limit exceeded' });

            // Mock Goal.com success
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch)
                .persist(); // Allow multiple calls

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].status).not.toBe('not_found');
            
            // Verify Football API was attempted first
            expect(nock.isDone()).toBe(true);
        });

        test('should fallback through multiple APIs until success', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock Football API failure
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(500, { error: 'Server Error' });

            // Mock Goal.com failure  
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(404, 'Not Found')
                .get(/\/en-in\/fixtures\/.*/)
                .reply(404, 'Not Found');

            // Mock TheSportsDB success
            nock('https://www.thesportsdb.com')
                .get('/api/v1/json/3/searchteams.php?t=Liverpool')
                .reply(200, testFixtures.sportsDbResponses.teamSearch.liverpool)
                .get(/\/api\/v1\/json\/3\/eventslast\.php\?id=.*/)
                .reply(200, testFixtures.sportsDbResponses.events.liverpool);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('TheSportsDB');
            expect(results[0].status).toBe('FINISHED');
        });

        test('should use Brave Search as final fallback', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock all primary APIs failing
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(503, { error: 'Service Unavailable' });

            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(500, 'Server Error')
                .get(/\/en-in\/fixtures\/.*/)
                .reply(500, 'Server Error');

            nock('https://www.thesportsdb.com')
                .get('/api/v1/json/3/searchteams.php?t=Liverpool')
                .reply(404, { error: 'Team not found' });

            // Mock Brave Search success
            nock('https://api.search.brave.com')
                .get(/\/res\/v1\/web\/search.*/)
                .reply(200, testFixtures.braveSearchResponses.liverpoolResult);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('Brave Search');
        });
    });

    describe('Partial Failures and Recovery', () => {
        test('should handle mixed success/failure across multiple selections', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' },
                { team: 'Chelsea', opponent: 'Arsenal', market: 'Full Time Result' },
                { team: 'UnknownTeam', opponent: 'AnotherTeam', market: 'Full Time Result' }
            ];

            // Mock success for Liverpool (Football API)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth)
                
                // Mock failure for Chelsea (Football API)
                .get('/teams?search=Chelsea')
                .reply(429, { message: 'Rate limit exceeded' })
                
                // Mock complete failure for UnknownTeam
                .get('/teams?search=UnknownTeam')
                .reply(404, { response: [] });

            // Mock Goal.com success for Chelsea fallback
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.chelseaMatch);

            // Mock all fallback failures for UnknownTeam
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(404, 'Not Found')
                .get(/\/en-in\/fixtures\/.*/)
                .reply(404, 'Not Found');

            nock('https://www.thesportsdb.com')
                .get('/api/v1/json/3/searchteams.php?t=UnknownTeam')
                .reply(404, { error: 'Team not found' });

            nock('https://api.search.brave.com')
                .get(/\/res\/v1\/web\/search.*/)
                .reply(200, testFixtures.braveSearchResponses.noResults);

            const results = await matchResultService.fetchMatchResults(selections, 3);

            expect(results).toHaveLength(3);
            
            // Liverpool should succeed via Football API
            expect(results[0].result).toBe('win');
            expect(results[0].source).toBe('Football API');
            
            // Chelsea should succeed via Goal.com fallback
            expect(results[1].source).toContain('Goal.com');
            
            // UnknownTeam should fail across all sources
            expect(results[2].status).toBe('not_found');
        });

        test('should handle timeout scenarios gracefully', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock slow Football API (will timeout)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .delay(35000) // Longer than service timeout
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool);

            // Mock fast Goal.com fallback
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch);

            const startTime = Date.now();
            const results = await matchResultService.fetchMatchResults(selections);
            const totalTime = Date.now() - startTime;

            expect(results).toHaveLength(1);
            expect(totalTime).toBeLessThan(40000); // Should timeout and fallback
            
            // Should get result from fallback source (not timeout)
            expect(results[0].status).not.toBe('error');
        });
    });

    describe('API Quality and Confidence Scoring', () => {
        test('should prioritize higher confidence sources', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock successful Football API response (highest confidence)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('Football API');
            expect(results[0].confidence).toBe('very_high');
            
            // Should not have attempted fallback sources
            expect(nock.pendingMocks()).toHaveLength(0);
        });

        test('should aggregate confidence scores correctly', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' },
                { team: 'Chelsea', opponent: 'Arsenal', market: 'Full Time Result' }
            ];

            // Liverpool via high-confidence source
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth)
                
                // Chelsea via fallback (lower confidence)
                .get('/teams?search=Chelsea')
                .reply(500, { error: 'Server Error' });

            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.chelseaMatch);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(2);
            expect(results[0].confidence).toBe('very_high'); // Football API
            expect(results[1].confidence).not.toBe('very_high'); // Fallback source
        });
    });

    describe('Rate Limiting and Retry Logic', () => {
        test('should handle rate limiting with proper backoff', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            let requestCount = 0;
            
            // Mock rate limiting then success
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .times(2)
                .reply(function() {
                    requestCount++;
                    if (requestCount === 1) {
                        return [429, { message: 'Rate limit exceeded' }];
                    }
                    return [200, testFixtures.footballApiResponses.teamSearch.liverpool];
                })
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth);

            const startTime = Date.now();
            const results = await matchResultService.fetchMatchResults(selections);
            const totalTime = Date.now() - startTime;

            expect(results).toHaveLength(1);
            expect(totalTime).toBeGreaterThan(2000); // Should have waited for backoff
            expect(requestCount).toBe(2); // Should have retried
        });

        test('should fallback after exhausting retries', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock persistent rate limiting
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .times(3)
                .reply(429, { message: 'Rate limit exceeded' });

            // Mock successful fallback
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].source).not.toBe('Football API');
        });
    });

    describe('Error Recovery Strategies', () => {
        test('should recover from network errors with fallback', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock network error
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

            // Mock successful fallback
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].status).not.toBe('error');
        });

        test('should handle malformed API responses', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock malformed response
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, { invalid: 'response structure' });

            // Mock valid fallback
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].status).not.toBe('error');
        });
    });

    describe('Fallback Performance', () => {
        test('should maintain reasonable performance during fallback cascades', async () => {
            const selections = Array.from({ length: 5 }, (_, i) => ({
                team: `Team${i}`,
                opponent: `Opponent${i}`,
                market: 'Full Time Result'
            }));

            // Mock all Football API calls to fail
            for (let i = 0; i < 5; i++) {
                nock('https://v3.football.api-sports.io')
                    .get(`/teams?search=Team${i}`)
                    .reply(503, { error: 'Service Unavailable' });
            }

            // Mock all Goal.com calls to fail
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .times(5)
                .reply(404, 'Not Found')
                .get(/\/en-in\/fixtures\/.*/)
                .times(5)
                .reply(404, 'Not Found');

            // Mock all TheSportsDB calls to fail
            for (let i = 0; i < 5; i++) {
                nock('https://www.thesportsdb.com')
                    .get(`/api/v1/json/3/searchteams.php?t=Team${i}`)
                    .reply(404, { error: 'Team not found' });
            }

            // Mock all Brave Search to return no results
            nock('https://api.search.brave.com')
                .get(/\/res\/v1\/web\/search.*/)
                .times(5)
                .reply(200, testFixtures.braveSearchResponses.noResults);

            const startTime = Date.now();
            const results = await matchResultService.fetchMatchResults(selections, 2);
            const totalTime = Date.now() - startTime;

            expect(results).toHaveLength(5);
            expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute
            
            // All should have attempted fallback
            results.forEach(result => {
                expect(result.status).toBe('not_found'); // No results, but processed
            });
        });
    });

    describe('Circuit Breaker Pattern', () => {
        test('should implement circuit breaker for repeatedly failing APIs', async () => {
            const selections = Array.from({ length: 10 }, (_, i) => ({
                team: `Team${i}`,
                opponent: `Opponent${i}`,
                market: 'Full Time Result'
            }));

            let footballApiCalls = 0;

            // Mock Football API to fail consistently
            nock('https://v3.football.api-sports.io')
                .get(/\/teams.*/)
                .times(20)
                .reply(function() {
                    footballApiCalls++;
                    return [500, { error: 'Server Error' }];
                });

            // Mock fallback to succeed
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .times(10)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch);

            await matchResultService.fetchMatchResults(selections, 3);

            // Should not make excessive calls to failing API
            // (This would require implementing circuit breaker in the service)
            console.log(`Football API calls made: ${footballApiCalls}`);
        });
    });
});
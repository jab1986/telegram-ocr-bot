/**
 * Unit tests for MatchResultService
 * Tests API integration, caching, and result processing
 */

const nock = require('nock');
const matchResultService = require('../../../src/services/matchResultService');
const testFixtures = require('../../fixtures/match-results');

// Mock the cache service
jest.mock('../../../src/services/cacheService', () => ({
    getMatchResult: jest.fn(),
    cacheMatchResult: jest.fn(),
    getTeamSearch: jest.fn(),
    cacheTeamSearch: jest.fn()
}));

const mockCacheService = require('../../../src/services/cacheService');

describe('MatchResultService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCacheService.getMatchResult.mockReturnValue(null);
        mockCacheService.getTeamSearch.mockReturnValue(null);
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('fetchMatchResults()', () => {
        test('should fetch results for multiple selections concurrently', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' },
                { team: 'Chelsea', opponent: 'Arsenal', market: 'Full Time Result' }
            ];

            // Mock cache misses
            mockCacheService.getMatchResult.mockReturnValue(null);

            // Mock Football API responses
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth);

            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Chelsea')
                .reply(200, testFixtures.footballApiResponses.teamSearch.chelsea)
                .get('/teams?search=Arsenal')
                .reply(200, { response: [{ team: { id: 42, name: 'Arsenal' } }] })
                .get(/\/fixtures.*team=49.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.chelseaVsArsenal);

            const startTime = Date.now();
            const results = await matchResultService.fetchMatchResults(selections, 2);
            const executionTime = Date.now() - startTime;

            expect(results).toHaveLength(2);
            expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
            
            // Check Liverpool result
            expect(results[0].result).toBe('win'); // Liverpool won 2-1
            expect(results[0].score).toBe('2-1');
            expect(results[0].source).toBe('Football API');

            // Check Chelsea result  
            expect(results[1].result).toBe('loss'); // Chelsea lost 0-1
            expect(results[1].score).toBe('0-1');
            expect(results[1].source).toBe('Football API');
        });

        test('should use cached results when available', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock cache hit
            const cachedResult = testFixtures.expectedResults.liverpoolWin;
            mockCacheService.getMatchResult.mockReturnValue(cachedResult);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].source).toContain('(cached)');
            expect(results[0].score).toBe('2-1');
            expect(mockCacheService.getMatchResult).toHaveBeenCalledWith(
                'Liverpool', 'Bournemouth', undefined
            );
        });

        test('should handle API failures gracefully with fallback sources', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock Football API failure (rate limit)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(429, { message: 'Rate limit exceeded' });

            // Mock Goal.com success (simplified mock)
            nock('https://www.goal.com')
                .get(/\/en-in\/results\/.*/)
                .reply(200, testFixtures.goalComResponses.liverpoolMatch);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            // Should fall back to other sources when Football API fails
        });

        test('should handle network timeouts', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock slow response (will timeout)
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .delay(35000) // Longer than test timeout
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool);

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].result).toBe('unknown');
            expect(results[0].status).toBe('not_found');
        });
    });

    describe('searchFootballAPI()', () => {
        test('should find team by search and return match result', async () => {
            // Mock team search
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool);

            // Mock fixtures
            nock('https://v3.football.api-sports.io')
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth);

            const result = await matchResultService.searchFootballAPI('Liverpool', 'Bournemouth', '2024-01-15');

            expect(result).toBeTruthy();
            expect(result.homeTeam).toBe('Liverpool');
            expect(result.awayTeam).toBe('AFC Bournemouth');
            expect(result.score).toBe('2-1');
            expect(result.winner).toBe('HOME');
            expect(result.source).toBe('Football API');
            expect(result.confidence).toBe('very_high');
        });

        test('should handle team not found', async () => {
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=UnknownTeam')
                .reply(200, { response: [] });

            const result = await matchResultService.searchFootballAPI('UnknownTeam', 'SomeTeam', '2024-01-15');

            expect(result).toBe(null);
        });

        test('should handle API rate limiting', async () => {
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(429, { message: 'Rate limit exceeded' });

            const result = await matchResultService.searchFootballAPI('Liverpool', 'Bournemouth');

            expect(result).toBe(null);
        });

        test('should handle authentication errors', async () => {
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(401, { message: 'Unauthorized' });

            await expect(matchResultService.searchFootballAPI('Liverpool', 'Bournemouth'))
                .rejects.toThrow('401: Football API authentication failed');
        });
    });

    describe('determineResult()', () => {
        test('should determine win for home team correctly', () => {
            const matchData = {
                homeTeam: 'Liverpool',
                awayTeam: 'Bournemouth',
                winner: 'HOME',
                status: 'FINISHED'
            };

            const result = matchResultService.determineResult(matchData, 'Liverpool', 'Full Time Result');
            expect(result).toBe('win');
        });

        test('should determine win for away team correctly', () => {
            const matchData = {
                homeTeam: 'Chelsea',
                awayTeam: 'Arsenal',
                winner: 'AWAY',
                status: 'FINISHED'
            };

            const result = matchResultService.determineResult(matchData, 'Arsenal', 'Full Time Result');
            expect(result).toBe('win');
        });

        test('should determine loss for draw result', () => {
            const matchData = {
                homeTeam: 'Liverpool',
                awayTeam: 'Chelsea',
                winner: 'DRAW',
                status: 'FINISHED'
            };

            const result = matchResultService.determineResult(matchData, 'Liverpool', 'Full Time Result');
            expect(result).toBe('loss');
        });

        test('should return pending for unfinished matches', () => {
            const matchData = {
                homeTeam: 'Liverpool',
                awayTeam: 'Chelsea',
                winner: 'HOME',
                status: 'LIVE'
            };

            const result = matchResultService.determineResult(matchData, 'Liverpool', 'Full Time Result');
            expect(result).toBe('pending');
        });
    });

    describe('normalizeTeamName()', () => {
        test('should normalize team names consistently', () => {
            expect(matchResultService.normalizeTeamName('Liverpool FC')).toBe('liverpool');
            expect(matchResultService.normalizeTeamName('Manchester United FC')).toBe('manchester united');
            expect(matchResultService.normalizeTeamName('SSC Napoli')).toBe('napoli');
        });
    });

    describe('Performance Tests', () => {
        test('should handle large fixtures response efficiently', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            // Mock team search
            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] });

            // Mock large fixtures response
            nock('https://v3.football.api-sports.io')
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.performanceTestData.largeFixturesResponse);

            const startTime = Date.now();
            const results = await matchResultService.fetchMatchResults(selections);
            const processingTime = Date.now() - startTime;

            expect(processingTime).toBeLessThan(5000);
            expect(results).toHaveLength(1);
        });

        test('should handle concurrent requests efficiently', async () => {
            const selections = Array.from({ length: 10 }, (_, i) => ({
                team: `Team${i}`,
                opponent: `Opponent${i}`,
                market: 'Full Time Result'
            }));

            // Mock all team searches to fail (will use fallback)
            for (let i = 0; i < 10; i++) {
                nock('https://v3.football.api-sports.io')
                    .get(`/teams?search=Team${i}`)
                    .reply(404, { response: [] });
            }

            const startTime = Date.now();
            const results = await matchResultService.fetchMatchResults(selections, 5);
            const processingTime = Date.now() - startTime;

            expect(results).toHaveLength(10);
            expect(processingTime).toBeLessThan(15000); // Should handle concurrency well
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed API responses', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, { malformed: 'response' });

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].result).toBe('unknown');
        });

        test('should handle network errors gracefully', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .replyWithError('Network error');

            const results = await matchResultService.fetchMatchResults(selections);

            expect(results).toHaveLength(1);
            expect(results[0].result).toBe('unknown');
        });
    });

    describe('Caching Behavior', () => {
        test('should cache successful API responses', async () => {
            const selections = [
                { team: 'Liverpool', opponent: 'Bournemouth', market: 'Full Time Result' }
            ];

            nock('https://v3.football.api-sports.io')
                .get('/teams?search=Liverpool')
                .reply(200, testFixtures.footballApiResponses.teamSearch.liverpool)
                .get('/teams?search=Bournemouth')
                .reply(200, { response: [{ team: { id: 35, name: 'AFC Bournemouth' } }] })
                .get(/\/fixtures.*team=40.*/)
                .reply(200, testFixtures.footballApiResponses.fixtures.liverpoolVsBournemouth);

            await matchResultService.fetchMatchResults(selections);

            expect(mockCacheService.cacheMatchResult).toHaveBeenCalledWith(
                'Liverpool',
                'Bournemouth',
                undefined,
                expect.objectContaining({
                    homeTeam: 'Liverpool',
                    awayTeam: 'AFC Bournemouth',
                    score: '2-1'
                })
            );

            expect(mockCacheService.cacheTeamSearch).toHaveBeenCalledWith(
                'Liverpool',
                expect.objectContaining({ id: 40, name: 'Liverpool' })
            );
        });

        test('should not cache failed API responses', async () => {
            const selections = [
                { team: 'UnknownTeam', opponent: 'AnotherTeam', market: 'Full Time Result' }
            ];

            nock('https://v3.football.api-sports.io')
                .get('/teams?search=UnknownTeam')
                .reply(404, { response: [] });

            await matchResultService.fetchMatchResults(selections);

            expect(mockCacheService.cacheMatchResult).not.toHaveBeenCalled();
        });
    });

    describe('getStats()', () => {
        test('should return performance statistics', () => {
            const stats = matchResultService.getStats();

            expect(stats).toHaveProperty('requests');
            expect(stats).toHaveProperty('cacheHits');
            expect(stats).toHaveProperty('cacheMisses');
            expect(stats).toHaveProperty('apiCallsBySource');
            expect(stats).toHaveProperty('avgResponseTime');
            expect(stats).toHaveProperty('hitRate');
            expect(typeof stats.hitRate).toBe('string');
        });
    });
});
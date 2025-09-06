/**
 * Match Result Service
 * Handles concurrent fetching of match results from multiple APIs
 */

const { fetch } = require('undici');
const cheerio = require('cheerio');
const config = require('../config/environment');
const cacheService = require('./cacheService');

class MatchResultService {
    constructor() {
        this.footballApiKey = config.get('apis.football');
        this.braveApiKey = config.get('apis.brave');
        this.requestTimeout = config.get('performance.requestTimeout');
        
        // API priority order
        this.apiSources = [
            { name: 'Football API', handler: this.searchFootballAPI.bind(this), priority: 1 },
            { name: 'Goal.com', handler: this.searchGoalCom.bind(this), priority: 2 },
            { name: 'TheSportsDB', handler: this.searchTheSportsDB.bind(this), priority: 3 },
            { name: 'Brave Search', handler: this.searchBrave.bind(this), priority: 4 }
        ];

        this.stats = {
            requests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            apiCallsBySource: {},
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }

    async fetchMatchResults(selections, concurrency = 2) {
        console.log(`🔍 Fetching results for ${selections.length} selections (concurrency: ${concurrency})`);
        
        // Process selections in batches for concurrent execution
        const batches = this.createBatches(selections, concurrency);
        const results = [];

        for (const batch of batches) {
            const batchPromises = batch.map(selection => this.fetchSelectionResult(selection));
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result, index) => {
                const selection = batch[index];
                if (result.status === 'fulfilled') {
                    Object.assign(selection, result.value);
                } else {
                    selection.result = 'error';
                    selection.error = result.reason?.message || 'Unknown error';
                    console.error(`❌ Error fetching result for ${selection.team}:`, result.reason);
                }
            });

            results.push(...batch);
        }

        console.log(`✅ Completed fetching results for ${results.length} selections`);
        return results;
    }

    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    async fetchSelectionResult(selection) {
        const startTime = Date.now();
        this.stats.requests++;

        try {
            // Check cache first
            const cacheKey = `${selection.team}_${selection.opponent || 'unknown'}`;
            const cachedResult = cacheService.getMatchResult(
                selection.team, 
                selection.opponent, 
                selection.matchDate
            );

            if (cachedResult) {
                this.stats.cacheHits++;
                console.log(`💾 Cache hit for ${selection.team}`);
                return {
                    result: this.determineResult(cachedResult, selection.team, selection.market),
                    score: cachedResult.score,
                    status: cachedResult.status,
                    source: `${cachedResult.source} (cached)`,
                    confidence: cachedResult.confidence
                };
            }

            this.stats.cacheMisses++;

            // Try different API sources in priority order
            for (const apiSource of this.apiSources) {
                try {
                    console.log(`🔍 Trying ${apiSource.name} for ${selection.team}...`);
                    
                    const matchData = await Promise.race([
                        apiSource.handler(selection.team, selection.opponent, selection.matchDate),
                        this.timeoutPromise(this.requestTimeout, `${apiSource.name} timeout`)
                    ]);

                    if (matchData) {
                        // Cache successful result
                        cacheService.cacheMatchResult(
                            selection.team, 
                            selection.opponent, 
                            selection.matchDate, 
                            matchData
                        );

                        // Update stats
                        this.stats.apiCallsBySource[apiSource.name] = 
                            (this.stats.apiCallsBySource[apiSource.name] || 0) + 1;

                        const responseTime = Date.now() - startTime;
                        this.stats.totalResponseTime += responseTime;
                        this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.requests;

                        console.log(`✅ Found result via ${apiSource.name} in ${responseTime}ms`);
                        
                        return {
                            result: this.determineResult(matchData, selection.team, selection.market),
                            score: matchData.score,
                            status: matchData.status,
                            source: matchData.source,
                            confidence: matchData.confidence,
                            responseTime
                        };
                    }
                } catch (apiError) {
                    console.warn(`⚠️ ${apiSource.name} failed:`, apiError.message);
                    continue;
                }
            }

            // No results found from any source
            console.log(`❌ No results found for ${selection.team} from any source`);
            return {
                result: 'unknown',
                status: 'not_found',
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            console.error(`❌ Error in fetchSelectionResult:`, error);
            return {
                result: 'error',
                status: 'error',
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    timeoutPromise(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }

    async searchFootballAPI(team, opponent, matchDate) {
        if (!this.footballApiKey) return null;

        try {
            console.log(`🥇 Football API: Searching for ${team}${opponent ? ` vs ${opponent}` : ''}${matchDate ? ` on ${matchDate}` : ''}`);
            
            // Find team ID
            const teamId = await this.findTeamIdBySearch(team);
            if (!teamId) {
                console.log('❌ Football API: Team not found');
                return null;
            }

            let opponentId = null;
            if (opponent) {
                opponentId = await this.findTeamIdBySearch(opponent);
            }

            console.log(`✅ Football API: Found team ID ${teamId}${opponentId ? ` and opponent ID ${opponentId}` : ''}`);
            
            // Search strategies in order of preference
            const searchStrategies = [
                () => matchDate ? this.searchFixturesByDate(teamId, opponentId, matchDate) : null,
                () => this.searchRecentFixtures(teamId, opponentId),
                () => opponentId ? this.searchFixturesByTeams(teamId, opponentId) : null
            ].filter(Boolean);

            for (const strategy of searchStrategies) {
                const result = await strategy();
                if (result) return result;
            }

            return null;

        } catch (error) {
            console.error('❌ Football API error:', error);
            return null;
        }
    }

    async findTeamIdBySearch(teamName) {
        const cachedTeam = cacheService.getTeamSearch(teamName);
        if (cachedTeam) return cachedTeam.id;

        try {
            const searchUrl = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(teamName)}`;
            const response = await this.makeFootballAPIRequest(searchUrl);
            if (!response) return null;

            const data = await response.json();
            
            if (data.response && data.response.length > 0) {
                const normalizedSearch = this.normalizeTeamName(teamName);
                let bestMatch = data.response[0];
                
                for (const teamData of data.response) {
                    const teamNorm = this.normalizeTeamName(teamData.team.name);
                    if (teamNorm.includes(normalizedSearch) || normalizedSearch.includes(teamNorm)) {
                        bestMatch = teamData;
                        break;
                    }
                }
                
                const teamInfo = { id: bestMatch.team.id, name: bestMatch.team.name };
                cacheService.cacheTeamSearch(teamName, teamInfo);
                
                console.log(`🎯 Football API: Matched "${teamName}" to "${bestMatch.team.name}" (ID: ${bestMatch.team.id})`);
                return bestMatch.team.id;
            }
            
            return null;
        } catch (error) {
            console.error('Error in team search:', error);
            return null;
        }
    }

    async makeFootballAPIRequest(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': this.footballApiKey,
                    'X-RapidAPI-Host': 'v3.football.api-sports.io'
                }
            });
            
            if (response.status === 429) {
                console.warn('⚠️ Football API rate limit exceeded');
                await new Promise(resolve => setTimeout(resolve, 2000));
                return null;
            }
            
            if (!response.ok) {
                console.error(`Football API HTTP error: ${response.status} ${response.statusText}`);
                return null;
            }
            
            return response;
            
        } catch (error) {
            console.error('Football API request error:', error);
            throw error;
        }
    }

    async searchFixturesByDate(teamId, opponentId, matchDate) {
        const searchDate = new Date(matchDate);
        const dates = [];
        
        // Search ±2 days around target date
        for (let i = -2; i <= 2; i++) {
            const date = new Date(searchDate);
            date.setDate(searchDate.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        for (const date of dates) {
            const fixturesUrl = `https://v3.football.api-sports.io/fixtures?team=${teamId}&date=${date}`;
            const response = await this.makeFootballAPIRequest(fixturesUrl);
            
            if (!response) continue;
            const data = await response.json();
            
            if (data.response && data.response.length > 0) {
                const match = this.findMatchingFixture(data.response, opponentId);
                if (match) {
                    console.log(`📅 Football API: Found match on ${date}`);
                    return match;
                }
            }
        }
        
        return null;
    }

    async searchRecentFixtures(teamId, opponentId) {
        const currentDate = new Date();
        const pastDate = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const fixturesUrl = `https://v3.football.api-sports.io/fixtures?team=${teamId}&from=${pastDate.toISOString().split('T')[0]}&to=${currentDate.toISOString().split('T')[0]}&status=FT`;
        
        const response = await this.makeFootballAPIRequest(fixturesUrl);
        if (!response) return null;
        
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
            const match = this.findMatchingFixture(data.response, opponentId);
            if (match) {
                console.log(`📊 Football API: Found match in recent fixtures`);
                return match;
            }
        }
        
        return null;
    }

    findMatchingFixture(fixtures, opponentId) {
        for (const fixture of fixtures) {
            if (fixture.fixture.status.short !== 'FT' || 
                fixture.goals.home === null || 
                fixture.goals.away === null) {
                continue;
            }
            
            if (opponentId && (fixture.teams.home.id === opponentId || fixture.teams.away.id === opponentId)) {
                return this.createMatchResult(fixture);
            }
        }
        
        return null;
    }

    createMatchResult(fixture) {
        const homeTeam = fixture.teams.home.name;
        const awayTeam = fixture.teams.away.name;
        const homeScore = fixture.goals.home;
        const awayScore = fixture.goals.away;
        
        let winner = 'DRAW';
        if (homeScore > awayScore) winner = 'HOME';
        else if (awayScore > homeScore) winner = 'AWAY';
        
        return {
            homeTeam,
            awayTeam,
            score: `${homeScore}-${awayScore}`,
            winner,
            status: 'FINISHED',
            source: 'Football API',
            confidence: 'very_high',
            matchDate: fixture.fixture.date.split('T')[0],
            league: fixture.league.name
        };
    }

    async searchGoalCom(team, opponent, matchDate) {
        // Implementation for Goal.com search (simplified)
        return null; // Placeholder - full implementation in original file
    }

    async searchTheSportsDB(team, opponent, matchDate) {
        // Implementation for TheSportsDB search (simplified)
        return null; // Placeholder - full implementation in original file
    }

    async searchBrave(team, opponent, matchDate) {
        // Implementation for Brave search (simplified)
        return null; // Placeholder - full implementation in original file
    }

    determineResult(matchData, team, market) {
        if (matchData.status !== 'FINISHED') {
            return 'pending';
        }
        
        if (market.includes('Full Time Result')) {
            const normalizedTeam = this.normalizeTeamName(team);
            const normalizedHome = this.normalizeTeamName(matchData.homeTeam);
            
            const isHomeTeam = normalizedHome.includes(normalizedTeam);
            
            if (matchData.winner === 'HOME' && isHomeTeam) return 'win';
            if (matchData.winner === 'AWAY' && !isHomeTeam) return 'win';
            if (matchData.winner === 'DRAW') return 'loss';
            return 'loss';
        }
        
        return 'unknown';
    }

    normalizeTeamName(name) {
        return name.toLowerCase()
            .replace(/\bfc\b/gi, '')
            .replace(/\bafc\b/gi, '')
            .replace(/\blfc\b/gi, '')
            .replace(/\bcfc\b/gi, '')
            .replace(/\bufc\b/gi, '')
            .replace(/\bssc\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.requests > 0 
                ? ((this.stats.cacheHits / this.stats.requests) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

module.exports = new MatchResultService();
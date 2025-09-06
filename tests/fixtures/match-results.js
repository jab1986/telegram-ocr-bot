/**
 * Test fixtures for match result API responses
 * Mock data for testing API integration and result parsing
 */

module.exports = {
    footballApiResponses: {
        teamSearch: {
            liverpool: {
                response: [
                    {
                        team: {
                            id: 40,
                            name: "Liverpool",
                            code: "LIV",
                            country: "England",
                            logo: "https://media.api-sports.io/football/teams/40.png"
                        }
                    }
                ]
            },
            chelsea: {
                response: [
                    {
                        team: {
                            id: 49,
                            name: "Chelsea",
                            code: "CHE",
                            country: "England",
                            logo: "https://media.api-sports.io/football/teams/49.png"
                        }
                    }
                ]
            }
        },
        fixtures: {
            liverpoolVsBournemouth: {
                response: [
                    {
                        fixture: {
                            id: 123456,
                            date: "2024-01-15T15:00:00+00:00",
                            status: {
                                long: "Match Finished",
                                short: "FT"
                            },
                            venue: {
                                id: 550,
                                name: "Anfield"
                            }
                        },
                        league: {
                            id: 39,
                            name: "Premier League"
                        },
                        teams: {
                            home: {
                                id: 40,
                                name: "Liverpool"
                            },
                            away: {
                                id: 35,
                                name: "AFC Bournemouth"
                            }
                        },
                        goals: {
                            home: 2,
                            away: 1
                        },
                        score: {
                            halftime: {
                                home: 1,
                                away: 0
                            },
                            fulltime: {
                                home: 2,
                                away: 1
                            }
                        }
                    }
                ]
            },
            chelseaVsArsenal: {
                response: [
                    {
                        fixture: {
                            id: 123457,
                            date: "2024-01-20T17:30:00+00:00",
                            status: {
                                long: "Match Finished",
                                short: "FT"
                            },
                            venue: {
                                id: 519,
                                name: "Stamford Bridge"
                            }
                        },
                        league: {
                            id: 39,
                            name: "Premier League"
                        },
                        teams: {
                            home: {
                                id: 49,
                                name: "Chelsea"
                            },
                            away: {
                                id: 42,
                                name: "Arsenal"
                            }
                        },
                        goals: {
                            home: 0,
                            away: 1
                        },
                        score: {
                            halftime: {
                                home: 0,
                                away: 0
                            },
                            fulltime: {
                                home: 0,
                                away: 1
                            }
                        }
                    }
                ]
            }
        }
    },

    goalComResponses: {
        liverpoolMatch: `
        <script type="application/ld+json">
        {
            "@type": "SportsEvent",
            "name": "Liverpool vs AFC Bournemouth",
            "eventStatus": "EventScheduled"
        }
        </script>
        <div class="match-row">
            <div class="match-row__team-home">Liverpool</div>
            <div class="match-row__team-away">AFC Bournemouth</div>
            <div class="match-row__goals">2</div>
            <div class="match-row__goals">1</div>
            <div class="match-row__state">FT</div>
        </div>`,

        chelseaMatch: `
        <div class="match-row">
            <div class="match-row__team-home">Chelsea</div>
            <div class="match-row__team-away">Arsenal</div>
            <div class="match-row__goals">0</div>
            <div class="match-row__goals">1</div>
            <div class="match-row__state">FT</div>
        </div>`
    },

    sportsDbResponses: {
        teamSearch: {
            liverpool: {
                teams: [
                    {
                        idTeam: "133602",
                        strTeam: "Liverpool",
                        strAlternate: "Liverpool FC",
                        strLeague: "English Premier League",
                        strSport: "Soccer"
                    }
                ]
            }
        },
        events: {
            liverpool: {
                results: [
                    {
                        idEvent: "1234567",
                        strEvent: "Liverpool vs AFC Bournemouth",
                        strHomeTeam: "Liverpool",
                        strAwayTeam: "AFC Bournemouth",
                        intHomeScore: "2",
                        intAwayScore: "1",
                        strSport: "Soccer",
                        dateEvent: "2024-01-15"
                    }
                ]
            }
        }
    },

    braveSearchResponses: {
        liverpoolResult: {
            web: {
                results: [
                    {
                        title: "Liverpool 2-1 AFC Bournemouth: Premier League Result",
                        description: "Liverpool secured a 2-1 victory over AFC Bournemouth at Anfield in the Premier League match on January 15, 2024.",
                        url: "https://www.bbc.co.uk/sport/football/68123456"
                    },
                    {
                        title: "Full Time: Liverpool beat Bournemouth 2-1",
                        description: "Liverpool claimed all three points with goals from Salah and Diaz defeating AFC Bournemouth 2-1",
                        url: "https://www.skysports.com/football/liverpool-vs-bournemouth/123456"
                    }
                ]
            }
        },
        noResults: {
            web: {
                results: []
            }
        }
    },

    expectedResults: {
        liverpoolWin: {
            homeTeam: 'Liverpool',
            awayTeam: 'AFC Bournemouth',
            score: '2-1',
            winner: 'HOME',
            status: 'FINISHED',
            confidence: 'very_high'
        },
        chelseaLoss: {
            homeTeam: 'Chelsea',
            awayTeam: 'Arsenal',
            score: '0-1',
            winner: 'AWAY',
            status: 'FINISHED',
            confidence: 'very_high'
        },
        drawResult: {
            homeTeam: 'Manchester United',
            awayTeam: 'Leeds United',
            score: '1-1',
            winner: 'DRAW',
            status: 'FINISHED',
            confidence: 'high'
        }
    },

    // Performance test data
    performanceTestData: {
        largeFixturesResponse: {
            response: Array.from({ length: 100 }, (_, i) => ({
                fixture: {
                    id: 100000 + i,
                    date: "2024-01-15T15:00:00+00:00",
                    status: { short: "FT" }
                },
                teams: {
                    home: { id: 40 + i, name: `Team ${i}A` },
                    away: { id: 50 + i, name: `Team ${i}B` }
                },
                goals: { home: i % 4, away: (i + 1) % 4 },
                league: { id: 39, name: "Premier League" }
            }))
        }
    },

    // Error responses for testing error handling
    errorResponses: {
        rateLimited: {
            status: 429,
            message: "Too Many Requests"
        },
        unauthorized: {
            status: 401,
            message: "Unauthorized"
        },
        serverError: {
            status: 500,
            message: "Internal Server Error"
        },
        networkTimeout: {
            code: 'ETIMEDOUT',
            message: 'Network timeout'
        }
    }
};
/**
 * Test fixtures for betting slip OCR text samples
 * Various betting slip formats and edge cases for testing
 */

module.exports = {
    // Valid betting slip with multiple selections
    validMultipleSelections: {
        ocrText: `Bet Ref B123456789
Bet Placed 15/01/2024 14:30
Liverpool
1.28
Full Time Result EP
Liverpool v Bournemouth
Tottenham
1.38
Full Time Result EP
Tottenham v Burnley
Barcelona
2.10
Full Time Result EP
Barcelona v Vallecano
3 Fold 3.72
Stake £10.00
To Return £37.20`,
        expected: {
            isBettingSlip: true,
            betRef: 'B123456789',
            matchDate: '2024-01-15',
            betType: '3 Fold',
            odds: 3.72,
            stake: 10.00,
            toReturn: 37.20,
            selections: [
                {
                    team: 'Liverpool',
                    odds: 1.28,
                    market: 'Full Time Result',
                    opponent: 'Bournemouth'
                },
                {
                    team: 'Tottenham',
                    odds: 1.38,
                    market: 'Full Time Result',
                    opponent: 'Burnley'
                },
                {
                    team: 'Barcelona',
                    odds: 2.10,
                    market: 'Full Time Result',
                    opponent: 'Vallecano'
                }
            ]
        }
    },

    // Single selection betting slip
    validSingleSelection: {
        ocrText: `Bet Ref S987654321
Chelsea
2.50
Full Time Result EP
Chelsea v Arsenal
Single 2.50
Stake £5.00
To Return £12.50
Bet Placed 20/01/2024 16:45`,
        expected: {
            isBettingSlip: true,
            betRef: 'S987654321',
            matchDate: '2024-01-20',
            selections: [
                {
                    team: 'Chelsea',
                    odds: 2.50,
                    market: 'Full Time Result',
                    opponent: 'Arsenal'
                }
            ]
        }
    },

    // Betting slip with "Yes/No" markets
    validYesNoMarket: {
        ocrText: `Bet Ref Y123456789
Both Teams To Score
Yes
1.53
Liverpool v Manchester City
No
2.20
Chelsea v Tottenham
Double 3.37
Stake £15.00
To Return £50.55`,
        expected: {
            isBettingSlip: true,
            betRef: 'Y123456789',
            selections: [
                {
                    team: 'Yes',
                    odds: 1.53,
                    market: 'Both Teams To Score'
                },
                {
                    team: 'No',
                    odds: 2.20,
                    market: 'Both Teams To Score'
                }
            ]
        }
    },

    // Betting slip with boost
    validWithBoost: {
        ocrText: `Bet Ref BOOST123
Manchester United
1.85
Full Time Result EP
Manchester United v Leeds
£5.00 Boost Applied
Single 1.85
Stake £20.00
To Return £37.00 + £5.00 Boost`,
        expected: {
            isBettingSlip: true,
            betRef: 'BOOST123',
            boost: 5.00,
            stake: 20.00,
            toReturn: 37.00,
            selections: [
                {
                    team: 'Manchester United',
                    odds: 1.85,
                    market: 'Full Time Result',
                    opponent: 'Leeds'
                }
            ]
        }
    },

    // Poor OCR quality with typos
    poorOcrQuality: {
        ocrText: `Bet Ref C123456789
L1verpoo1
1.28
Fu11 T1me Result EP
L1verpoo1 v Bournemouth
Sp0rs
1.38
Fu11 T1me Result EP
Sp0rs v Burn1ey
2 F01d 1.77
Stake £10.00
To Return £17.70`,
        expected: {
            isBettingSlip: true,
            betRef: 'C123456789',
            selections: [
                {
                    team: 'L1verpoo1',
                    odds: 1.28,
                    market: 'Full Time Result',
                    opponent: 'Bournemouth'
                },
                {
                    team: 'Sp0rs', // Should still be recognized as anchor
                    odds: 1.38,
                    market: 'Full Time Result',
                    opponent: 'Burn1ey'
                }
            ]
        }
    },

    // Not a betting slip
    notBettingSlip: {
        ocrText: `Shopping List
Milk
Bread
Eggs
£15.50 total`,
        expected: {
            isBettingSlip: false,
            selections: []
        }
    },

    // Empty/invalid input
    emptyInput: {
        ocrText: '',
        expected: {
            isBettingSlip: false,
            selections: []
        }
    },

    // International teams
    internationalTeams: {
        ocrText: `Bet Ref INT123
Bayern Munich
1.65
Full Time Result
Bayern Munich v Borussia Dortmund
AC Milan
2.10
Full Time Result
AC Milan v Juventus
Double 3.47
Stake £25.00
To Return £86.75`,
        expected: {
            isBettingSlip: true,
            betRef: 'INT123',
            selections: [
                {
                    team: 'Bayern Munich',
                    odds: 1.65,
                    market: 'Full Time Result',
                    opponent: 'Borussia Dortmund'
                },
                {
                    team: 'AC Milan',
                    odds: 2.10,
                    market: 'Full Time Result',
                    opponent: 'Juventus'
                }
            ]
        }
    },

    // Over/Under markets
    overUnderMarkets: {
        ocrText: `Bet Ref OU123
Over 2.5 Goals
1.85
Liverpool v Arsenal
Under 1.5 Goals
3.20
Chelsea v Manchester City
Double 5.92
Stake £5.00
To Return £29.60`,
        expected: {
            isBettingSlip: true,
            betRef: 'OU123',
            selections: [
                {
                    team: 'Over',
                    odds: 1.85,
                    market: 'Total Goals'
                },
                {
                    team: 'Under',
                    odds: 3.20,
                    market: 'Total Goals'
                }
            ]
        }
    },

    // Edge case: Missing fixture information
    missingFixture: {
        ocrText: `Bet Ref MISSING123
Liverpool
1.50
Barcelona
2.20
Double 3.30
Stake £10.00
To Return £33.00`,
        expected: {
            isBettingSlip: true,
            betRef: 'MISSING123',
            selections: [
                {
                    team: 'Liverpool',
                    odds: 1.50,
                    market: 'Unknown',
                    opponent: null
                },
                {
                    team: 'Barcelona',
                    odds: 2.20,
                    market: 'Unknown',
                    opponent: null
                }
            ]
        }
    },

    // High odds accumulator
    highOddsAccumulator: {
        ocrText: `Bet Ref HIGH123
Leicester
15.00
Full Time Result
Leicester v Manchester City
Norwich
8.50
Full Time Result
Norwich v Liverpool
Watford
12.00
Full Time Result
Watford v Chelsea
Southampton
6.00
Full Time Result
Southampton v Arsenal
4 Fold 91800.00
Stake £1.00
To Return £91800.00`,
        expected: {
            isBettingSlip: true,
            betRef: 'HIGH123',
            betType: '4 Fold',
            odds: 91800.00,
            stake: 1.00,
            toReturn: 91800.00,
            selections: [
                {
                    team: 'Leicester',
                    odds: 15.00,
                    market: 'Full Time Result',
                    opponent: 'Manchester City'
                },
                {
                    team: 'Norwich',
                    odds: 8.50,
                    market: 'Full Time Result',
                    opponent: 'Liverpool'
                },
                {
                    team: 'Watford',
                    odds: 12.00,
                    market: 'Full Time Result',
                    opponent: 'Chelsea'
                },
                {
                    team: 'Southampton',
                    odds: 6.00,
                    market: 'Full Time Result',
                    opponent: 'Arsenal'
                }
            ]
        }
    }
};
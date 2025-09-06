/**
 * Unit tests for BettingSlipAnalyzer service
 * Tests OCR text parsing and betting slip analysis logic
 */

const bettingSlipAnalyzer = require('../../../src/services/bettingSlipAnalyzer');
const testFixtures = require('../../fixtures/betting-slips');

describe('BettingSlipAnalyzer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('analyze()', () => {
        test('should correctly parse valid multiple selection betting slip', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);
            const expected = testFixtures.validMultipleSelections.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.betRef).toBe(expected.betRef);
            expect(result.matchDate).toBe(expected.matchDate);
            expect(result.betType).toBe(expected.betType);
            expect(result.odds).toBe(expected.odds);
            expect(result.stake).toBe(expected.stake);
            expect(result.toReturn).toBe(expected.toReturn);
            expect(result.selections).toHaveLength(expected.selections.length);

            expected.selections.forEach((expectedSelection, index) => {
                const actualSelection = result.selections[index];
                expect(actualSelection.team).toBe(expectedSelection.team);
                expect(actualSelection.odds).toBe(expectedSelection.odds);
                expect(actualSelection.market).toBe(expectedSelection.market);
                expect(actualSelection.opponent).toBe(expectedSelection.opponent);
            });
        });

        test('should correctly parse single selection betting slip', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.validSingleSelection.ocrText);
            const expected = testFixtures.validSingleSelection.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.betRef).toBe(expected.betRef);
            expect(result.matchDate).toBe(expected.matchDate);
            expect(result.selections).toHaveLength(1);

            const selection = result.selections[0];
            expect(selection.team).toBe(expected.selections[0].team);
            expect(selection.odds).toBe(expected.selections[0].odds);
            expect(selection.market).toBe(expected.selections[0].market);
            expect(selection.opponent).toBe(expected.selections[0].opponent);
        });

        test('should handle Yes/No betting markets', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.validYesNoMarket.ocrText);
            const expected = testFixtures.validYesNoMarket.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.betRef).toBe(expected.betRef);
            expect(result.selections).toHaveLength(expected.selections.length);

            result.selections.forEach((selection, index) => {
                const expectedSelection = expected.selections[index];
                expect(selection.team).toBe(expectedSelection.team);
                expect(selection.odds).toBe(expectedSelection.odds);
                if (expectedSelection.market) {
                    expect(selection.market).toBe(expectedSelection.market);
                }
            });
        });

        test('should handle betting slip with boost', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.validWithBoost.ocrText);
            const expected = testFixtures.validWithBoost.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.boost).toBe(expected.boost);
            expect(result.stake).toBe(expected.stake);
            expect(result.toReturn).toBe(expected.toReturn);
        });

        test('should handle poor OCR quality with typos', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.poorOcrQuality.ocrText);
            const expected = testFixtures.poorOcrQuality.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.betRef).toBe(expected.betRef);
            expect(result.selections).toHaveLength(expected.selections.length);

            // Should still parse selections even with OCR errors
            result.selections.forEach((selection, index) => {
                expect(selection.team).toBe(expected.selections[index].team);
                expect(selection.odds).toBe(expected.selections[index].odds);
            });
        });

        test('should reject non-betting slip text', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.notBettingSlip.ocrText);
            
            expect(result.isBettingSlip).toBe(false);
            expect(result.selections).toHaveLength(0);
        });

        test('should handle empty input gracefully', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.emptyInput.ocrText);
            
            expect(result.isBettingSlip).toBe(false);
            expect(result.selections).toHaveLength(0);
            expect(result.metadata.textLength).toBe(0);
        });

        test('should handle international teams', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.internationalTeams.ocrText);
            const expected = testFixtures.internationalTeams.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.selections).toHaveLength(expected.selections.length);

            result.selections.forEach((selection, index) => {
                const expectedSelection = expected.selections[index];
                expect(selection.team).toBe(expectedSelection.team);
                expect(selection.odds).toBe(expectedSelection.odds);
                expect(selection.opponent).toBe(expectedSelection.opponent);
            });
        });

        test('should handle Over/Under markets', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.overUnderMarkets.ocrText);
            const expected = testFixtures.overUnderMarkets.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.selections).toHaveLength(expected.selections.length);

            result.selections.forEach((selection, index) => {
                const expectedSelection = expected.selections[index];
                expect(selection.team).toBe(expectedSelection.team);
                expect(selection.odds).toBe(expectedSelection.odds);
                expect(selection.market).toBe(expectedSelection.market);
            });
        });

        test('should handle high odds accumulator', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.highOddsAccumulator.ocrText);
            const expected = testFixtures.highOddsAccumulator.expected;

            expect(result.isBettingSlip).toBe(true);
            expect(result.betType).toBe(expected.betType);
            expect(result.odds).toBe(expected.odds);
            expect(result.stake).toBe(expected.stake);
            expect(result.toReturn).toBe(expected.toReturn);
            expect(result.selections).toHaveLength(expected.selections.length);
        });

        test('should include processing metadata', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.validSingleSelection.ocrText);

            expect(result.metadata).toBeDefined();
            expect(result.metadata.processingTime).toBeDefined();
            expect(result.metadata.textLength).toBeDefined();
            expect(result.metadata.lineCount).toBeDefined();
            expect(typeof result.metadata.processingTime).toBe('number');
        });
    });

    describe('isAnchor()', () => {
        test('should identify known team names as anchors', () => {
            expect(bettingSlipAnalyzer.isAnchor('Liverpool')).toBe(true);
            expect(bettingSlipAnalyzer.isAnchor('Barcelona')).toBe(true);
            expect(bettingSlipAnalyzer.isAnchor('Manchester')).toBe(true);
        });

        test('should identify betting market terms as anchors', () => {
            expect(bettingSlipAnalyzer.isAnchor('Yes')).toBe(true);
            expect(bettingSlipAnalyzer.isAnchor('No')).toBe(true);
            expect(bettingSlipAnalyzer.isAnchor('Over')).toBe(true);
            expect(bettingSlipAnalyzer.isAnchor('Under')).toBe(true);
        });

        test('should reject odds patterns as anchors', () => {
            expect(bettingSlipAnalyzer.isAnchor('1.28')).toBe(false);
            expect(bettingSlipAnalyzer.isAnchor('£10.00')).toBe(false);
        });

        test('should reject invalid length strings', () => {
            expect(bettingSlipAnalyzer.isAnchor('A')).toBe(false);
            expect(bettingSlipAnalyzer.isAnchor('A'.repeat(51))).toBe(false);
        });
    });

    describe('normalizeTeamName()', () => {
        test('should normalize team names correctly', () => {
            expect(bettingSlipAnalyzer.normalizeTeamName('Liverpool FC')).toBe('liverpool');
            expect(bettingSlipAnalyzer.normalizeTeamName('Manchester United FC')).toBe('manchester');
            expect(bettingSlipAnalyzer.normalizeTeamName('SSC Napoli')).toBe('napoli');
            expect(bettingSlipAnalyzer.normalizeTeamName('Brighton & Hove Albion')).toBe('brighton hove');
        });

        test('should handle empty strings', () => {
            expect(bettingSlipAnalyzer.normalizeTeamName('')).toBe('');
        });
    });

    describe('parseMatchDate()', () => {
        test('should parse DD/MM/YYYY format', () => {
            expect(bettingSlipAnalyzer.parseMatchDate('15/01/2024')).toBe('2024-01-15');
            expect(bettingSlipAnalyzer.parseMatchDate('01/12/2024')).toBe('2024-12-01');
        });

        test('should parse DD-MM-YYYY format', () => {
            expect(bettingSlipAnalyzer.parseMatchDate('15-01-2024')).toBe('2024-01-15');
        });

        test('should parse DD.MM.YYYY format', () => {
            expect(bettingSlipAnalyzer.parseMatchDate('15.01.2024')).toBe('2024-01-15');
        });

        test('should parse DD Mon YYYY format', () => {
            expect(bettingSlipAnalyzer.parseMatchDate('15 Jan 2024')).toBe('2024-01-15');
            expect(bettingSlipAnalyzer.parseMatchDate('01 December 2024')).toBe('2024-12-01');
        });

        test('should handle two-digit years', () => {
            expect(bettingSlipAnalyzer.parseMatchDate('15/01/24')).toBe('2024-01-15');
        });

        test('should return null for invalid dates', () => {
            expect(bettingSlipAnalyzer.parseMatchDate('invalid-date')).toBe(null);
            expect(bettingSlipAnalyzer.parseMatchDate('')).toBe(null);
        });
    });

    describe('extractMarket()', () => {
        test('should identify market types correctly', () => {
            expect(bettingSlipAnalyzer.extractMarket(['Full Time Result EP'])).toBe('Full Time Result');
            expect(bettingSlipAnalyzer.extractMarket(['Double Chance'])).toBe('Double Chance');
            expect(bettingSlipAnalyzer.extractMarket(['Both Teams To Score'])).toBe('Both Teams To Score');
            expect(bettingSlipAnalyzer.extractMarket(['Over 2.5 Goals'])).toBe('Total Goals');
            expect(bettingSlipAnalyzer.extractMarket(['Under 1.5 Goals'])).toBe('Total Goals');
        });

        test('should return Unknown for unrecognized markets', () => {
            expect(bettingSlipAnalyzer.extractMarket(['Random Text'])).toBe('Unknown');
            expect(bettingSlipAnalyzer.extractMarket([])).toBe('Unknown');
        });
    });

    describe('Performance Tests', () => {
        test('should process large betting slip within reasonable time', () => {
            const largeBettingSlip = Array.from({ length: 20 }, (_, i) => `
                Team ${i}
                ${(Math.random() * 10 + 1).toFixed(2)}
                Full Time Result
                Team ${i} v Team ${i + 20}
            `).join('\n');

            const startTime = Date.now();
            const result = bettingSlipAnalyzer.analyze(`Bet Ref LARGE123\n${largeBettingSlip}\nStake £100.00`);
            const processingTime = Date.now() - startTime;

            expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
            expect(result.isBettingSlip).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle selections with missing odds', () => {
            const result = bettingSlipAnalyzer.analyze(testFixtures.missingFixture.ocrText);
            
            expect(result.isBettingSlip).toBe(true);
            // Should still find selections even without complete fixture info
            expect(result.selections.length).toBeGreaterThan(0);
        });

        test('should handle malformed input gracefully', () => {
            const malformedInput = 'Bet Ref \n\n\n Liverpool \n\n 1.28 \n\n\n';
            const result = bettingSlipAnalyzer.analyze(malformedInput);
            
            expect(result.isBettingSlip).toBe(true);
            expect(() => result).not.toThrow();
        });

        test('should handle extremely long team names', () => {
            const longTeamName = 'A'.repeat(100);
            const input = `Bet Ref TEST123\n${longTeamName}\n1.50\nStake £10.00`;
            
            expect(() => bettingSlipAnalyzer.analyze(input)).not.toThrow();
        });
    });
});
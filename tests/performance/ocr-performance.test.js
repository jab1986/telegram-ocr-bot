/**
 * Performance tests for OCR processing and analysis
 * Tests processing speed, memory usage, and scalability
 */

const bettingSlipAnalyzer = require('../../src/services/bettingSlipAnalyzer');
const testFixtures = require('../fixtures/betting-slips');

describe('OCR Processing Performance', () => {
    describe('Processing Speed Tests', () => {
        test('should process simple betting slip within acceptable time', () => {
            const iterations = 100;
            const startTime = Date.now();

            for (let i = 0; i < iterations; i++) {
                bettingSlipAnalyzer.analyze(testFixtures.validSingleSelection.ocrText);
            }

            const totalTime = Date.now() - startTime;
            const avgTimePerOperation = totalTime / iterations;

            console.log(`Average processing time: ${avgTimePerOperation.toFixed(2)}ms`);
            expect(avgTimePerOperation).toBeLessThan(50); // Should process within 50ms per slip
            expect(totalTime).toBeLessThan(5000); // Total should be under 5 seconds
        });

        test('should process complex betting slip within reasonable time', () => {
            const iterations = 50;
            const startTime = Date.now();

            for (let i = 0; i < iterations; i++) {
                bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);
            }

            const totalTime = Date.now() - startTime;
            const avgTimePerOperation = totalTime / iterations;

            console.log(`Complex slip average time: ${avgTimePerOperation.toFixed(2)}ms`);
            expect(avgTimePerOperation).toBeLessThan(100); // Should process within 100ms
            expect(totalTime).toBeLessThan(5000);
        });

        test('should handle large betting slip efficiently', () => {
            // Create betting slip with 20 selections
            const largeBettingSlip = `Bet Ref LARGE123
${Array.from({ length: 20 }, (_, i) => `
Team${i}
${(Math.random() * 10 + 1).toFixed(2)}
Full Time Result
Team${i} v Opponent${i}
`).join('')}
20 Fold 1000000.00
Stake £1.00
To Return £1000000.00`;

            const startTime = Date.now();
            const result = bettingSlipAnalyzer.analyze(largeBettingSlip);
            const processingTime = Date.now() - startTime;

            expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
            expect(result.selections).toHaveLength(20);
            expect(result.isBettingSlip).toBe(true);

            console.log(`Large betting slip (20 selections) processed in ${processingTime}ms`);
        });
    });

    describe('Memory Usage Tests', () => {
        test('should not leak memory during repeated processing', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Process 1000 betting slips
            for (let i = 0; i < 1000; i++) {
                const result = bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);
                // Ensure we're actually using the result to prevent optimization
                expect(result.isBettingSlip).toBe(true);
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

            console.log(`Memory increase after 1000 operations: ${memoryIncreaseMB.toFixed(2)}MB`);
            expect(memoryIncreaseMB).toBeLessThan(50); // Should not increase by more than 50MB
        });

        test('should handle extremely long OCR text efficiently', () => {
            // Create very long OCR text (simulate poor quality OCR with lots of noise)
            const longOcrText = `Bet Ref LONG123
${'Random noise text that might appear in poor OCR '.repeat(1000)}
Liverpool
1.50
Full Time Result
Liverpool v Arsenal
Single 1.50
Stake £10.00`;

            const startTime = Date.now();
            const initialMemory = process.memoryUsage().heapUsed;
            
            const result = bettingSlipAnalyzer.analyze(longOcrText);
            
            const processingTime = Date.now() - startTime;
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryUsed = (finalMemory - initialMemory) / (1024 * 1024);

            expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
            expect(memoryUsed).toBeLessThan(10); // Should not use more than 10MB
            expect(result.isBettingSlip).toBe(true);

            console.log(`Long OCR text processed in ${processingTime}ms using ${memoryUsed.toFixed(2)}MB`);
        });
    });

    describe('Scalability Tests', () => {
        test('should handle concurrent processing efficiently', async () => {
            const concurrentRequests = 50;
            const startTime = Date.now();

            // Create array of different betting slips for processing
            const bettingSlips = [
                testFixtures.validSingleSelection.ocrText,
                testFixtures.validMultipleSelections.ocrText,
                testFixtures.validYesNoMarket.ocrText,
                testFixtures.validWithBoost.ocrText
            ];

            const promises = Array.from({ length: concurrentRequests }, (_, i) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const slip = bettingSlips[i % bettingSlips.length];
                        const result = bettingSlipAnalyzer.analyze(slip);
                        resolve(result);
                    }, Math.random() * 10); // Small random delay to simulate real-world conditions
                });
            });

            const results = await Promise.all(promises);
            const totalTime = Date.now() - startTime;

            expect(results).toHaveLength(concurrentRequests);
            expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
            
            // All results should be valid
            results.forEach(result => {
                expect(result.isBettingSlip).toBe(true);
                expect(result.metadata).toBeDefined();
            });

            console.log(`${concurrentRequests} concurrent requests processed in ${totalTime}ms`);
        });

        test('should maintain performance with increasing complexity', () => {
            const complexityLevels = [1, 5, 10, 15, 20];
            const performanceMetrics = [];

            complexityLevels.forEach(selectionCount => {
                const complexBettingSlip = `Bet Ref COMPLEX${selectionCount}
${Array.from({ length: selectionCount }, (_, i) => `
TeamComplex${i}
${(Math.random() * 5 + 1).toFixed(2)}
Full Time Result
TeamComplex${i} v OpponentComplex${i}
`).join('')}
${selectionCount} Fold ${Math.pow(2, selectionCount).toFixed(2)}
Stake £10.00`;

                const iterations = Math.max(10, Math.floor(100 / selectionCount)); // Fewer iterations for complex slips
                const startTime = Date.now();

                for (let i = 0; i < iterations; i++) {
                    bettingSlipAnalyzer.analyze(complexBettingSlip);
                }

                const totalTime = Date.now() - startTime;
                const avgTime = totalTime / iterations;

                performanceMetrics.push({
                    selections: selectionCount,
                    avgTime,
                    totalTime
                });

                console.log(`${selectionCount} selections: ${avgTime.toFixed(2)}ms avg (${iterations} iterations)`);
                expect(avgTime).toBeLessThan(selectionCount * 50); // Should scale reasonably
            });

            // Performance should scale sub-linearly (not exponentially)
            for (let i = 1; i < performanceMetrics.length; i++) {
                const prev = performanceMetrics[i - 1];
                const curr = performanceMetrics[i];
                const performanceRatio = curr.avgTime / prev.avgTime;
                const complexityRatio = curr.selections / prev.selections;

                // Performance should not degrade faster than complexity increases
                expect(performanceRatio).toBeLessThan(complexityRatio * 2);
            }
        });
    });

    describe('Stress Tests', () => {
        test('should handle malformed input without performance degradation', () => {
            const malformedInputs = [
                '', // Empty
                'A'.repeat(10000), // Very long single line
                '\n'.repeat(1000), // Many empty lines
                'Random text with no structure'.repeat(100), // Noise
                '!@#$%^&*()'.repeat(500), // Special characters
            ];

            malformedInputs.forEach((input, index) => {
                const startTime = Date.now();
                const result = bettingSlipAnalyzer.analyze(input);
                const processingTime = Date.now() - startTime;

                expect(processingTime).toBeLessThan(1000); // Should handle gracefully within 1 second
                expect(result).toBeDefined();
                expect(result.metadata).toBeDefined();

                console.log(`Malformed input ${index + 1} processed in ${processingTime}ms`);
            });
        });

        test('should maintain consistent performance under sustained load', () => {
            const batchSize = 100;
            const batches = 10;
            const batchTimes = [];

            for (let batch = 0; batch < batches; batch++) {
                const batchStart = Date.now();

                for (let i = 0; i < batchSize; i++) {
                    bettingSlipAnalyzer.analyze(testFixtures.validMultipleSelections.ocrText);
                }

                const batchTime = Date.now() - batchStart;
                batchTimes.push(batchTime);

                console.log(`Batch ${batch + 1}: ${batchTime}ms`);
            }

            // Calculate performance consistency
            const avgBatchTime = batchTimes.reduce((sum, time) => sum + time, 0) / batches;
            const maxBatchTime = Math.max(...batchTimes);
            const minBatchTime = Math.min(...batchTimes);
            const variance = maxBatchTime - minBatchTime;

            console.log(`Performance consistency: avg=${avgBatchTime.toFixed(2)}ms, variance=${variance}ms`);
            
            // Performance should be consistent (variance < 50% of average)
            expect(variance).toBeLessThan(avgBatchTime * 0.5);
            expect(avgBatchTime).toBeLessThan(5000); // Each batch should complete within 5 seconds
        });
    });

    describe('Resource Monitoring', () => {
        test('should provide accurate performance metrics', () => {
            const testCases = [
                testFixtures.validSingleSelection,
                testFixtures.validMultipleSelections,
                testFixtures.highOddsAccumulator
            ];

            testCases.forEach((testCase, index) => {
                const result = bettingSlipAnalyzer.analyze(testCase.ocrText);

                expect(result.metadata.processingTime).toBeGreaterThan(0);
                expect(result.metadata.textLength).toBe(testCase.ocrText.length);
                expect(result.metadata.lineCount).toBeGreaterThan(0);

                console.log(`Test case ${index + 1} metrics:`, {
                    processingTime: result.metadata.processingTime,
                    textLength: result.metadata.textLength,
                    lineCount: result.metadata.lineCount,
                    selections: result.selections.length
                });
            });
        });

        test('should track processing efficiency', () => {
            const testInput = testFixtures.validMultipleSelections.ocrText;
            const iterations = 50;
            const startTime = Date.now();
            let totalProcessingTime = 0;

            for (let i = 0; i < iterations; i++) {
                const result = bettingSlipAnalyzer.analyze(testInput);
                totalProcessingTime += result.metadata.processingTime;
            }

            const realTotalTime = Date.now() - startTime;
            const efficiency = (totalProcessingTime / realTotalTime) * 100;

            console.log(`Processing efficiency: ${efficiency.toFixed(2)}% (processing time vs real time)`);
            console.log(`Average reported processing time: ${(totalProcessingTime / iterations).toFixed(2)}ms`);
            console.log(`Average real time per operation: ${(realTotalTime / iterations).toFixed(2)}ms`);

            // Efficiency should be reasonable (accounting for test overhead)
            expect(efficiency).toBeGreaterThan(10); // At least 10% efficiency
            expect(efficiency).toBeLessThan(200); // Not more than 200% (accounting for measurement overhead)
        });
    });
});
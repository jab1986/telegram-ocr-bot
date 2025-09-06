/**
 * OCR Worker Pool Implementation
 * Manages Tesseract workers for concurrent processing
 */

const { createWorker } = require('tesseract.js');
const EventEmitter = require('events');
const config = require('../config/environment');

class OCRWorkerPool extends EventEmitter {
    constructor() {
        super();
        this.workers = [];
        this.availableWorkers = [];
        this.busyWorkers = new Set();
        this.queue = [];
        this.poolSize = config.get('ocr.workerPoolSize');
        this.initialized = false;
        this.shuttingDown = false;

        // Statistics
        this.stats = {
            processed: 0,
            failed: 0,
            avgProcessingTime: 0,
            totalProcessingTime: 0
        };
    }

    async initialize() {
        if (this.initialized) return;

        console.log(`🔧 Initializing OCR worker pool with ${this.poolSize} workers...`);
        
        try {
            const initPromises = Array(this.poolSize).fill(null).map(async (_, index) => {
                const worker = await this.createWorker(index);
                this.workers.push(worker);
                this.availableWorkers.push(worker);
                return worker;
            });

            await Promise.all(initPromises);
            this.initialized = true;
            console.log(`✅ OCR worker pool initialized with ${this.workers.length} workers`);
            this.emit('ready');
        } catch (error) {
            console.error('❌ Failed to initialize OCR worker pool:', error);
            throw error;
        }
    }

    async createWorker(id) {
        try {
            const worker = await createWorker('eng', 1, {
                workerPath: require('path').join(__dirname, '../../node_modules/tesseract.js/src/worker-script/node/index.js')
            });

            const ocrConfig = config.get('ocr.tesseractConfig');
            await worker.setParameters(ocrConfig);

            worker._id = id;
            worker._createdAt = Date.now();
            worker._processedCount = 0;

            console.log(`🔧 OCR worker ${id} initialized`);
            return worker;
        } catch (error) {
            console.error(`❌ Failed to create OCR worker ${id}:`, error);
            throw error;
        }
    }

    async processImage(imageBuffer, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.shuttingDown) {
            throw new Error('OCR worker pool is shutting down');
        }

        return new Promise((resolve, reject) => {
            const task = {
                imageBuffer,
                options,
                resolve,
                reject,
                startTime: Date.now(),
                timeout: setTimeout(() => {
                    reject(new Error('OCR processing timeout'));
                }, config.get('ocr.timeout'))
            };

            this.queue.push(task);
            this.processQueue();
        });
    }

    async processQueue() {
        while (this.queue.length > 0 && this.availableWorkers.length > 0) {
            const task = this.queue.shift();
            const worker = this.availableWorkers.shift();
            
            this.busyWorkers.add(worker);
            this.processTask(worker, task).finally(() => {
                this.busyWorkers.delete(worker);
                this.availableWorkers.push(worker);
                
                // Continue processing queue
                if (this.queue.length > 0) {
                    setImmediate(() => this.processQueue());
                }
            });
        }
    }

    async processTask(worker, task) {
        try {
            clearTimeout(task.timeout);
            const startTime = Date.now();

            console.log(`🔄 OCR worker ${worker._id} processing image...`);
            
            const result = await worker.recognize(task.imageBuffer, task.options);
            
            const processingTime = Date.now() - startTime;
            worker._processedCount++;
            
            // Update statistics
            this.stats.processed++;
            this.stats.totalProcessingTime += processingTime;
            this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

            console.log(`✅ OCR worker ${worker._id} completed in ${processingTime}ms (confidence: ${result.data.confidence.toFixed(1)}%)`);
            
            task.resolve({
                text: result.data.text,
                confidence: result.data.confidence,
                processingTime,
                workerId: worker._id
            });

            this.emit('taskCompleted', {
                workerId: worker._id,
                processingTime,
                confidence: result.data.confidence
            });

        } catch (error) {
            console.error(`❌ OCR worker ${worker._id} failed:`, error);
            this.stats.failed++;
            task.reject(error);

            this.emit('taskFailed', {
                workerId: worker._id,
                error: error.message
            });
        }
    }

    getStats() {
        return {
            ...this.stats,
            poolSize: this.poolSize,
            availableWorkers: this.availableWorkers.length,
            busyWorkers: this.busyWorkers.size,
            queueLength: this.queue.length,
            workers: this.workers.map(w => ({
                id: w._id,
                processedCount: w._processedCount,
                uptime: Date.now() - w._createdAt
            }))
        };
    }

    async shutdown() {
        if (this.shuttingDown) return;
        
        console.log('🔄 Shutting down OCR worker pool...');
        this.shuttingDown = true;

        // Cancel queued tasks
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            clearTimeout(task.timeout);
            task.reject(new Error('OCR worker pool shutdown'));
        }

        // Wait for busy workers to complete
        if (this.busyWorkers.size > 0) {
            console.log(`⏳ Waiting for ${this.busyWorkers.size} workers to complete...`);
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.busyWorkers.size === 0) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        // Terminate all workers
        const terminatePromises = this.workers.map(async (worker) => {
            try {
                await worker.terminate();
                console.log(`✅ OCR worker ${worker._id} terminated`);
            } catch (error) {
                console.error(`❌ Error terminating worker ${worker._id}:`, error);
            }
        });

        await Promise.all(terminatePromises);
        console.log('✅ OCR worker pool shutdown complete');
    }
}

// Export singleton instance
module.exports = new OCRWorkerPool();
# Service Architecture Documentation

## Service Layer Design

The Telegram OCR Betting Slip Bot implements a layered service architecture that separates concerns and provides clear interfaces between components. Each service is designed to be independently testable, maintainable, and scalable.

## Service Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                Application Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Telegram  │  │   Match     │  │   Betting   │  │
│  │   Bot       │  │   Result    │  │   Slip      │  │
│  │   Service   │  │   Service   │  │   Analyzer  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│              Infrastructure Services                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    OCR      │  │    Cache    │  │  Validation │  │
│  │   Worker    │  │   Service   │  │   Service   │  │
│  │    Pool     │  └─────────────┘  └─────────────┘  │
│  └─────────────┘  ┌─────────────┐                   │
│                   │   Logging   │                   │
│                   │   Service   │                   │
│                   └─────────────┘                   │
└─────────────────────────────────────────────────────┘
```

## Core Services

### 1. Telegram Bot Service (`src/bot/telegramBot.js`)

**Responsibility**: Primary interface for user interactions and Telegram API communication.

**Key Components**:
- Message routing and command processing
- Image download and validation
- Response formatting and delivery
- Rate limiting and user management
- Error handling and recovery

**Service Dependencies**:
```javascript
// Direct dependencies
const ocrWorkerPool = require('../services/ocrWorkerPool');
const bettingSlipAnalyzer = require('../services/bettingSlipAnalyzer');
const matchResultService = require('../services/matchResultService');
const validationService = require('../services/validationService');
const logger = require('../services/loggingService');
const cacheService = require('../services/cacheService');
```

**Public Interface**:
```javascript
class TelegramBotService {
  async initialize()                    // Initialize bot and services
  async shutdown()                      // Graceful shutdown
  getStats()                           // Service statistics
  
  // Internal methods
  async handleImageMessage(msg, type)   // Process image uploads
  async downloadImage(msg, type)        // Download Telegram images
  checkRateLimit(userId)               // Rate limiting check
  formatBettingSlipResponse(analysis)   // Response formatting
}
```

### 2. Betting Slip Analyzer (`src/services/bettingSlipAnalyzer.js`)

**Responsibility**: OCR text processing and betting slip data extraction.

**Core Algorithm Flow**:
```
Raw OCR Text → Text Preprocessing → Anchor Detection → Block Grouping → 
Regex Parsing → Data Validation → Structured Output
```

**Key Features**:
- Anchor-based text parsing using known team names and betting markets
- Intelligent fixture matching and opponent identification
- Multi-format date parsing and normalization
- Confidence scoring for parsed selections
- Comprehensive error handling and recovery

**Parsing Logic**:
```javascript
parseSelections(lines) {
  const selections = [];
  const selectionBlocks = this.groupIntoBlocks(lines);
  
  for (const block of selectionBlocks) {
    const selection = this.parseSelectionBlock(block);
    if (selection && selection.odds) {
      selections.push(selection);
    }
  }
  
  return selections;
}
```

**Team Name Normalization**:
- Removes common suffixes (FC, AFC, LFC, etc.)
- Handles Manchester United/City abbreviations
- Normalizes whitespace and punctuation
- Supports international team names

### 3. Match Result Service (`src/services/matchResultService.js`)

**Responsibility**: Multi-source match result fetching with intelligent fallback.

**API Integration Strategy**:
```javascript
// Priority-based API sources
this.apiSources = [
  { name: 'Football API', handler: this.searchFootballAPI, priority: 1 },
  { name: 'Goal.com', handler: this.searchGoalCom, priority: 2 },
  { name: 'TheSportsDB', handler: this.searchTheSportsDB, priority: 3 },
  { name: 'Brave Search', handler: this.searchBrave, priority: 4 }
];
```

**Concurrent Processing**:
- Batch processing for multiple selections
- Configurable concurrency limits
- Timeout handling and circuit breaker pattern
- Comprehensive error recovery

**Search Strategies**:
1. **Date-based Search**: Match date + team combination
2. **Recent Fixtures**: Last 30 days of team matches
3. **Head-to-head**: Direct team vs team lookup
4. **Web Search**: Fallback for lower league results

### 4. OCR Worker Pool (`src/services/ocrWorkerPool.js`)

**Responsibility**: Concurrent OCR processing with Tesseract.js worker management.

**Architecture Features**:
- Configurable worker pool size
- Load balancing across workers
- Resource monitoring and cleanup
- Queue management for high load

**Tesseract Configuration**:
```javascript
const tesseractConfig = {
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789£.:/- ',
  tessedit_pageseg_mode: '6',      // Single column of text
  preserve_interword_spaces: '1'    // Maintain spacing
};
```

**Performance Optimization**:
- Worker reuse to avoid initialization overhead
- Memory management and cleanup
- Processing time monitoring
- Failure retry logic

## Infrastructure Services

### 1. Cache Service (`src/services/cacheService.js`)

**Responsibility**: In-memory caching for API responses and computed results.

**Cache Categories**:
- **Match Results**: Team vs opponent results with TTL
- **Team Searches**: Team name to ID mappings
- **API Responses**: Raw API responses for reuse
- **OCR Results**: Processed betting slip analysis

**Cache Management**:
```javascript
class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    this.maxEntries = config.get('cache.maxEntries');
    this.defaultTTL = config.get('cache.ttlMinutes') * 60 * 1000;
  }
  
  // LRU eviction strategy
  evictOldest() {
    const oldestKey = this.cache.keys().next().value;
    this.cache.delete(oldestKey);
    this.stats.evictions++;
  }
}
```

### 2. Validation Service (`src/services/validationService.js`)

**Responsibility**: Input validation, sanitization, and security checks.

**Validation Categories**:
- **Image Validation**: Size, format, dimensions
- **Text Sanitization**: XSS prevention, harmful content filtering
- **Betting Slip Analysis**: Quality scoring and confidence assessment
- **API Response Validation**: Data integrity checks

**Security Features**:
- Input size limits to prevent DoS
- Malicious content detection
- Path traversal prevention
- Regex catastrophic backtracking protection

### 3. Logging Service (`src/services/loggingService.js`)

**Responsibility**: Structured logging with context and performance metrics.

**Logging Levels**:
- **Error**: Critical failures requiring immediate attention
- **Warn**: Issues that don't break functionality
- **Info**: Normal operational events
- **Debug**: Detailed debugging information

**Structured Logging Format**:
```javascript
{
  timestamp: "2025-09-05T10:30:45.123Z",
  level: "info",
  message: "Betting slip analysis completed",
  context: {
    chatId: 123456789,
    selectionsFound: 3,
    processingTime: 1250,
    ocrConfidence: 92.5,
    source: "betting_slip_analyzer"
  }
}
```

**Performance Monitoring**:
- Request/response time tracking
- Memory usage monitoring
- System metrics logging
- Error rate calculation

## Service Communication Patterns

### 1. Direct Service Calls
Most services communicate through direct method invocation:

```javascript
// Telegram Bot Service calling other services
const ocrResult = await ocrWorkerPool.processImage(imageBuffer);
const analysis = bettingSlipAnalyzer.analyze(ocrResult.text);
await matchResultService.fetchMatchResults(analysis.selections);
```

### 2. Event-Driven Architecture (Future Enhancement)
Services can be extended to support event-driven communication:

```javascript
// Service events for monitoring and extension
eventEmitter.emit('betting_slip_analyzed', {
  chatId,
  selections: analysis.selections,
  confidence: analysis.metadata.confidence
});
```

### 3. Configuration-Based Dependency Injection
Services receive dependencies through configuration:

```javascript
class MatchResultService {
  constructor(config) {
    this.cacheService = config.cacheService || defaultCache;
    this.logger = config.logger || defaultLogger;
    this.apis = config.apiSources || defaultAPIs;
  }
}
```

## Service Lifecycle Management

### 1. Initialization Sequence
Services are initialized in dependency order:

```javascript
async function initializeServices() {
  // 1. Infrastructure services first
  await logger.initialize();
  await cacheService.initialize();
  await validationService.initialize();
  
  // 2. Core processing services
  await ocrWorkerPool.initialize();
  await bettingSlipAnalyzer.initialize();
  await matchResultService.initialize();
  
  // 3. Application services last
  await telegramBot.initialize();
}
```

### 2. Graceful Shutdown
Services implement graceful shutdown in reverse dependency order:

```javascript
async function shutdownServices() {
  // 1. Stop accepting new requests
  await telegramBot.shutdown();
  
  // 2. Complete in-flight operations
  await ocrWorkerPool.shutdown();
  await matchResultService.shutdown();
  
  // 3. Cleanup infrastructure
  await cacheService.shutdown();
  await logger.shutdown();
}
```

## Error Handling and Recovery

### 1. Service-Level Error Handling
Each service implements comprehensive error handling:

```javascript
async fetchMatchResults(selections) {
  try {
    // Process selections
    return await this.processSelections(selections);
  } catch (error) {
    logger.logError(error, {
      service: 'match_result_service',
      operation: 'fetch_match_results',
      selectionsCount: selections.length
    });
    
    // Return partial results or fallback
    return this.handleGracefulFailure(selections, error);
  }
}
```

### 2. Circuit Breaker Pattern
Services implement circuit breakers for external dependencies:

```javascript
class APICircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async call(apiFunction) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await apiFunction();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Performance Considerations

### 1. Service Scalability
Services are designed for horizontal scaling:
- Stateless design where possible
- External cache compatibility
- Resource usage monitoring
- Configurable concurrency limits

### 2. Memory Management
- Object pooling for frequently created objects
- Cache size limits with LRU eviction
- Worker pool resource cleanup
- Memory leak detection

### 3. CPU Optimization
- Async/await for non-blocking operations
- Worker pools for CPU-intensive tasks
- Batch processing for multiple operations
- Lazy loading of expensive resources

This service architecture provides a robust, scalable foundation for the betting slip analysis bot with clear separation of concerns and comprehensive error handling.
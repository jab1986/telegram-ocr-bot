# Service Interfaces Documentation

## Overview

This document provides detailed interface specifications for all internal services within the Telegram OCR Betting Slip Bot. Each service exposes well-defined interfaces that enable modular development, testing, and maintenance.

## Service Interface Design Principles

### 1. Consistent Interface Patterns
- **Async/await**: All service methods are asynchronous
- **Error Handling**: Standardized error objects with context
- **Return Types**: Consistent response formats across services
- **Configuration**: Injectable configuration objects

### 2. Dependency Injection
Services accept dependencies through constructor parameters:
```javascript
class ExampleService {
  constructor(logger, cache, config) {
    this.logger = logger;
    this.cache = cache;
    this.config = config;
  }
}
```

### 3. Interface Contracts
Each service implements a clear interface contract with:
- Input validation
- Output guarantees
- Error handling specifications
- Performance characteristics

## Core Service Interfaces

### 1. Betting Slip Analyzer Interface

```javascript
interface BettingSlipAnalyzerInterface {
  // Primary analysis method
  analyze(ocrText: string): Promise<BettingSlipAnalysis>
  
  // Text preprocessing
  preprocessText(text: string): string[]
  
  // Betting slip detection
  isBettingSlip(lines: string[]): boolean
  
  // Selection parsing
  parseSelections(lines: string[]): Selection[]
  
  // Utility methods
  normalizeTeamName(name: string): string
  parseMatchDate(dateString: string): string | null
}
```

**BettingSlipAnalysis Type**:
```typescript
interface BettingSlipAnalysis {
  isBettingSlip: boolean;
  betRef: string | null;
  selections: Selection[];
  stake: number | null;
  toReturn: number | null;
  boost: number | null;
  betType: string | null;
  odds: number | null;
  matchDate: string | null;
  metadata: AnalysisMetadata;
}

interface Selection {
  team: string;
  odds: number | null;
  market: string;
  opponent: string | null;
  confidence: number;
  rawLines: string[];
}

interface AnalysisMetadata {
  processingTime: number;
  textLength: number;
  lineCount: number;
  anchorsFound: number;
  parseErrors: string[];
}
```

**Implementation Contract**:
```javascript
class BettingSlipAnalyzer {
  constructor() {
    this.knownTeams = [...]; // Team database
    this.bettingMarkets = [...]; // Market terminology
  }

  async analyze(ocrText) {
    // Contract guarantees:
    // 1. Always returns valid BettingSlipAnalysis object
    // 2. Processing time logged in metadata
    // 3. Errors captured in parseErrors array
    // 4. Confidence scores between 0-1
    
    const startTime = Date.now();
    try {
      // Implementation logic here
      return {
        isBettingSlip: true,
        selections: [...],
        metadata: {
          processingTime: Date.now() - startTime,
          // ... other metadata
        }
      };
    } catch (error) {
      return {
        isBettingSlip: false,
        selections: [],
        metadata: {
          processingTime: Date.now() - startTime,
          parseErrors: [error.message]
        }
      };
    }
  }
}
```

### 2. Match Result Service Interface

```javascript
interface MatchResultServiceInterface {
  // Primary result fetching
  fetchMatchResults(selections: Selection[], concurrency?: number): Promise<EnrichedSelection[]>
  
  // Individual API source methods
  searchFootballAPI(team: string, opponent?: string, matchDate?: string): Promise<MatchResult | null>
  searchGoalCom(team: string, opponent?: string, matchDate?: string): Promise<MatchResult | null>
  searchTheSportsDB(team: string, opponent?: string, matchDate?: string): Promise<MatchResult | null>
  searchBrave(team: string, opponent?: string, matchDate?: string): Promise<MatchResult | null>
  
  // Utility methods
  determineResult(matchData: MatchResult, team: string, market: string): string
  normalizeTeamName(name: string): string
  getStats(): ServiceStats
}
```

**EnrichedSelection Type**:
```typescript
interface EnrichedSelection extends Selection {
  // Match result data
  result: 'win' | 'loss' | 'draw' | 'pending' | 'unknown';
  status: 'finished' | 'live' | 'scheduled' | 'not_found' | 'error';
  score: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  matchDate: string | null;
  
  // Analysis metadata
  source: string; // API source used
  confidence: 'very_high' | 'high' | 'medium' | 'low';
  responseTime: number;
  
  // Error handling
  error?: string;
  apiCalls: ApiCall[];
}

interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  score: string;
  winner: 'HOME' | 'AWAY' | 'DRAW';
  status: 'FINISHED' | 'LIVE' | 'SCHEDULED';
  source: string;
  confidence: string;
  matchDate: string;
  league?: string;
}

interface ApiCall {
  source: string;
  url: string;
  responseTime: number;
  success: boolean;
  error?: string;
}
```

**Service Statistics Interface**:
```typescript
interface ServiceStats {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  apiCallsBySource: Record<string, number>;
  avgResponseTime: number;
  totalResponseTime: number;
  hitRate: string;
}
```

### 3. OCR Worker Pool Interface

```javascript
interface OCRWorkerPoolInterface {
  // Lifecycle management
  initialize(): Promise<void>
  shutdown(): Promise<void>
  
  // Image processing
  processImage(imageBuffer: Buffer, options?: OCROptions): Promise<OCRResult>
  
  // Pool management
  getStats(): PoolStats
  isHealthy(): boolean
  getAvailableWorkers(): number
}
```

**OCR Types**:
```typescript
interface OCROptions {
  language?: string;
  oem?: number;
  psm?: number;
  tessedit_char_whitelist?: string;
  preserve_interword_spaces?: number;
  timeout?: number;
}

interface OCRResult {
  text: string;
  confidence: number;
  words: Word[];
  processingTime: number;
  workerUsed: number;
}

interface Word {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface PoolStats {
  poolSize: number;
  availableWorkers: number;
  busyWorkers: number;
  processed: number;
  failed: number;
  avgProcessingTime: number;
  totalProcessingTime: number;
}
```

### 4. Cache Service Interface

```javascript
interface CacheServiceInterface {
  // Basic cache operations
  get(key: string): any | null
  set(key: string, value: any, ttl?: number): void
  delete(key: string): boolean
  clear(): void
  has(key: string): boolean
  
  // Specialized cache methods
  cacheMatchResult(team: string, opponent: string, date: string, result: MatchResult): void
  getMatchResult(team: string, opponent: string, date: string): MatchResult | null
  cacheTeamSearch(teamName: string, teamInfo: TeamInfo): void
  getTeamSearch(teamName: string): TeamInfo | null
  
  // Cache management
  getStats(): CacheStats
  cleanup(): void
  shutdown(): void
}
```

**Cache Types**:
```typescript
interface CacheEntry {
  value: any;
  ttl: number;
  createdAt: number;
}

interface TeamInfo {
  id: number;
  name: string;
  league?: string;
  country?: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: string;
  size: number;
  maxEntries: number;
  memoryUsage: number;
  evictions: number;
}
```

### 5. Validation Service Interface

```javascript
interface ValidationServiceInterface {
  // Image validation
  validateImageInput(telegramMessage: TelegramMessage): ValidationResult
  validateImageFile(file: FileObject): ValidationResult
  
  // Betting slip validation
  validateBettingSlipAnalysis(analysis: BettingSlipAnalysis): ValidationResult
  validateSelection(selection: Selection): ValidationResult
  
  // Text validation
  sanitizeText(text: string): string
  validateTextInput(text: string, maxLength?: number): ValidationResult
  
  // Telegram validation
  validateTelegramMessage(message: TelegramMessage): ValidationResult
  
  // Utility methods
  formatValidationErrors(result: ValidationResult): string
}
```

**Validation Types**:
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  quality?: 'high' | 'medium' | 'low' | 'very_low';
  confidence?: number;
}

interface FileObject {
  size: number;
  mimeType: string;
  fileName?: string;
}
```

### 6. Logging Service Interface

```javascript
interface LoggingServiceInterface {
  // Standard logging levels
  debug(message: string, metadata?: any): void
  info(message: string, metadata?: any): void
  warn(message: string, metadata?: any): void
  error(message: string, metadata?: any): void
  
  // Specialized logging methods
  logError(error: Error, context?: any): void
  logTelegramMessage(message: TelegramMessage, type: string): void
  logOCRProcess(result: OCRResult, processingTime: number): void
  logBettingSlipAnalysis(analysis: BettingSlipAnalysis): void
  logSystemMetrics(): void
  
  // Performance tracking
  startPerformanceTimer(operationId: string): PerformanceTimer
  endPerformanceTimer(operationId: string, context?: any): void
  
  // Service management
  shutdown(): void
}
```

**Logging Types**:
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
  context?: any;
}

interface PerformanceTimer {
  operationId: string;
  startTime: number;
  end(context?: any): void;
}
```

## Service Integration Patterns

### 1. Service Composition

Services are composed to create higher-level functionality:

```javascript
class TelegramBotService {
  constructor(dependencies) {
    this.ocrWorkerPool = dependencies.ocrWorkerPool;
    this.bettingSlipAnalyzer = dependencies.bettingSlipAnalyzer;
    this.matchResultService = dependencies.matchResultService;
    this.validationService = dependencies.validationService;
    this.logger = dependencies.logger;
    this.cache = dependencies.cache;
  }
  
  async processImageMessage(message) {
    // Orchestrate multiple services
    const validation = this.validationService.validateImageInput(message);
    if (!validation.isValid) {
      return this.handleValidationError(validation);
    }
    
    const imageBuffer = await this.downloadImage(message);
    const ocrResult = await this.ocrWorkerPool.processImage(imageBuffer);
    const analysis = await this.bettingSlipAnalyzer.analyze(ocrResult.text);
    
    if (analysis.isBettingSlip) {
      const enrichedSelections = await this.matchResultService.fetchMatchResults(analysis.selections);
      return this.formatResponse(analysis, enrichedSelections);
    }
    
    return this.formatOCRResponse(ocrResult);
  }
}
```

### 2. Error Propagation

Standardized error handling across service boundaries:

```javascript
class ServiceError extends Error {
  constructor(message, code, context) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

// Service implementation
async serviceMethod() {
  try {
    // Service logic
  } catch (error) {
    throw new ServiceError(
      'Service operation failed',
      'SERVICE_ERROR',
      { originalError: error.message, operation: 'serviceMethod' }
    );
  }
}
```

### 3. Configuration Injection

Services receive configuration through a consistent interface:

```javascript
interface ServiceConfig {
  // Service-specific configuration
  [key: string]: any;
  
  // Common configuration
  logger?: LoggingServiceInterface;
  cache?: CacheServiceInterface;
  timeout?: number;
  retries?: number;
}

class ConfigurableService {
  constructor(config: ServiceConfig) {
    this.config = config;
    this.logger = config.logger || console;
    this.cache = config.cache || new MemoryCache();
  }
}
```

## Interface Testing

### 1. Interface Contracts

Each service interface includes a contract test suite:

```javascript
// Contract test example
describe('BettingSlipAnalyzer Interface Contract', () => {
  let analyzer;
  
  beforeEach(() => {
    analyzer = new BettingSlipAnalyzer();
  });
  
  test('analyze() returns valid BettingSlipAnalysis', async () => {
    const result = await analyzer.analyze('test text');
    
    expect(result).toHaveProperty('isBettingSlip');
    expect(result).toHaveProperty('selections');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('processingTime');
    expect(typeof result.metadata.processingTime).toBe('number');
  });
  
  test('analyze() handles errors gracefully', async () => {
    const result = await analyzer.analyze(null);
    
    expect(result.isBettingSlip).toBe(false);
    expect(result.metadata.parseErrors.length).toBeGreaterThan(0);
  });
});
```

### 2. Mock Implementations

Mock services for testing:

```javascript
class MockMatchResultService implements MatchResultServiceInterface {
  async fetchMatchResults(selections) {
    return selections.map(selection => ({
      ...selection,
      result: 'win',
      status: 'finished',
      score: '2-1',
      source: 'mock',
      confidence: 'high',
      responseTime: 100
    }));
  }
  
  getStats() {
    return {
      requests: 1,
      cacheHits: 0,
      cacheMisses: 1,
      apiCallsBySource: { mock: 1 },
      avgResponseTime: 100,
      totalResponseTime: 100,
      hitRate: '0%'
    };
  }
}
```

## Performance Characteristics

### 1. Expected Performance

Each service interface specifies performance expectations:

**Betting Slip Analyzer**:
- Simple slip (1-3 selections): <100ms
- Complex slip (5+ selections): <300ms
- Memory usage: <50MB per analysis

**Match Result Service**:
- Single API call: <2s average
- Batch processing: <5s for 10 selections
- Cache hit response: <10ms

**OCR Worker Pool**:
- High quality image: <2s
- Poor quality image: <5s
- Concurrent processing: 3 workers default

### 2. Resource Management

Services implement resource cleanup:

```javascript
class ResourceManagedService {
  constructor() {
    this.resources = [];
  }
  
  async initialize() {
    // Acquire resources
  }
  
  async shutdown() {
    // Clean up all resources
    await Promise.all(
      this.resources.map(resource => resource.cleanup())
    );
  }
}
```

This service interface documentation provides the foundation for understanding, testing, and extending the bot's service architecture.
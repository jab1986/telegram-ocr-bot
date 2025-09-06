# API Reference

## Service APIs

The bot exposes several internal service APIs that can be used for testing, integration, and extending functionality.

## Betting Slip Analyzer API

### `analyze(ocrText)`

Analyzes raw OCR text and extracts betting slip data.

**Parameters:**
- `ocrText` (string) - Raw text extracted from OCR processing

**Returns:**
```javascript
{
  isBettingSlip: boolean,
  betRef: string | null,
  selections: Array<Selection>,
  stake: number | null,
  toReturn: number | null,
  boost: number | null,
  betType: string | null,
  odds: number | null,
  matchDate: Date | null,
  metadata: {
    processingTime: number,
    textLength: number,
    lineCount: number,
    confidence: number,
    anchorsFound: number,
    parseErrors: Array<string>
  }
}
```

**Selection Object Structure:**
```javascript
{
  selection: string,      // Team name or market selection (e.g., "Liverpool", "Yes")
  odds: string,          // Betting odds (e.g., "1.28")
  betType: string,       // Market type (e.g., "Full Time Result")
  fixture: string | null, // Match fixture (e.g., "Liverpool v Bournemouth")
  confidence: number,    // Parsing confidence score (0-1)
  rawText: Array<string>, // Original text lines
  parseErrors: Array<string>
}
```

**Example Usage:**
```javascript
const analyzer = new BettingSlipAnalyzer();
const result = analyzer.analyze(`
Liverpool
1.28
Full Time Result EP
Liverpool v Bournemouth
Yes
1.53
Both Teams To Score
`);

console.log(result.selections);
// Output: [
//   {
//     selection: "Liverpool",
//     odds: "1.28",
//     betType: "Full Time Result",
//     fixture: "Liverpool v Bournemouth",
//     confidence: 0.95
//   },
//   {
//     selection: "Yes",
//     odds: "1.53",
//     betType: "Both Teams To Score",
//     fixture: null,
//     confidence: 0.87
//   }
// ]
```

### `preprocessText(text)`

Preprocesses raw OCR text for analysis.

**Parameters:**
- `text` (string) - Raw OCR text

**Returns:**
- `Array<string>` - Cleaned and normalized text lines

**Text Processing Steps:**
1. Line splitting and trimming
2. Empty line removal
3. Special character normalization
4. Case standardization
5. Duplicate line removal

## Match Result Service API

### `fetchMatchResults(selections, concurrency)`

Fetches match results for betting selections using multiple APIs.

**Parameters:**
- `selections` (Array<Selection>) - Betting selections to lookup
- `concurrency` (number) - Maximum concurrent API calls (default: 2)

**Returns:**
```javascript
{
  results: Array<EnrichedSelection>,
  metadata: {
    totalProcessingTime: number,
    apiCallsMade: number,
    cacheHitsCount: number,
    cacheMissesCount: number,
    successRate: number,
    failedSources: Array<string>
  }
}
```

**EnrichedSelection Object:**
```javascript
{
  // Original selection data
  selection: string,
  odds: string,
  betType: string,
  fixture: string | null,
  
  // Match result data
  matchFound: boolean,
  homeTeam: string | null,
  awayTeam: string | null,
  homeScore: number | null,
  awayScore: number | null,
  result: string | null,     // "home", "away", "draw"
  status: string | null,     // "finished", "live", "scheduled"
  matchDate: Date | null,
  
  // Analysis
  isWin: boolean | null,
  confidence: number,        // Result confidence (0-1)
  source: string,           // API source used
  
  // Debugging
  apiCalls: Array<ApiCall>,
  errors: Array<string>
}
```

**Example Usage:**
```javascript
const matchService = new MatchResultService();
const selections = [
  { selection: "Liverpool", fixture: "Liverpool v Bournemouth", odds: "1.28" }
];

const results = await matchService.fetchMatchResults(selections, 2);
console.log(results.results[0]);
// Output: {
//   selection: "Liverpool",
//   matchFound: true,
//   homeTeam: "Liverpool",
//   awayTeam: "Bournemouth", 
//   homeScore: 3,
//   awayScore: 0,
//   result: "home",
//   isWin: true,
//   confidence: 0.98,
//   source: "Football API"
// }
```

### API Source Methods

#### `searchFootballAPI(selection, options)`

Searches Football API for match results.

**Parameters:**
- `selection` (Selection) - Betting selection
- `options` (Object) - Search options

**Options:**
```javascript
{
  date: Date,              // Match date hint
  season: string,          // Season identifier
  league: string,          // League filter
  limit: number           // Result limit (default: 10)
}
```

#### `searchGoalCom(selection, options)`

Scrapes Goal.com for match results using JSON-LD parsing.

#### `searchTheSportsDB(selection, options)`  

Searches TheSportsDB free API for match data.

#### `searchBrave(selection, options)`

Uses Brave Search API for lower league and comprehensive results.

## OCR Worker Pool API

### `processImage(imageBuffer, options)`

Processes betting slip image using OCR worker pool.

**Parameters:**
- `imageBuffer` (Buffer) - Image data
- `options` (Object) - OCR configuration

**OCR Options:**
```javascript
{
  language: 'eng',                    // Tesseract language
  oem: 3,                            // OCR Engine Mode
  psm: 6,                            // Page Segmentation Mode
  tessedit_char_whitelist: string,    // Allowed characters
  preserve_interword_spaces: 1,       // Preserve spacing
  timeout: 30000                     // Processing timeout
}
```

**Returns:**
```javascript
{
  text: string,           // Extracted text
  confidence: number,     // OCR confidence (0-100)
  words: Array<Word>,     // Word-level data
  processingTime: number, // Time taken (ms)
  workerUsed: number     // Worker ID used
}
```

## Cache Service API

### `get(key)`

Retrieves cached data.

**Parameters:**
- `key` (string) - Cache key

**Returns:**
- `any | null` - Cached data or null if not found

### `set(key, value, ttl)`

Stores data in cache.

**Parameters:**
- `key` (string) - Cache key
- `value` (any) - Data to cache  
- `ttl` (number) - Time to live in milliseconds (optional)

### `delete(key)`

Removes data from cache.

### `clear()`

Clears entire cache.

### `getStats()`

Returns cache statistics.

**Returns:**
```javascript
{
  hits: number,
  misses: number,
  hitRate: number,
  size: number,
  maxSize: number,
  memoryUsage: number
}
```

## Validation Service API

### `validateImageFile(file)`

Validates uploaded image files.

**Parameters:**
- `file` (Object) - File object with size and mimetype

**Returns:**
```javascript
{
  isValid: boolean,
  errors: Array<string>,
  warnings: Array<string>
}
```

**Validation Rules:**
- Maximum file size: 10MB
- Allowed formats: JPEG, PNG, WebP
- Minimum dimensions: 100x100px
- Maximum dimensions: 4000x4000px

### `validateBettingSelection(selection)`

Validates betting selection data.

### `sanitizeText(text)`

Sanitizes text input for security.

## Logging Service API

### `info(message, metadata)`

Logs informational message.

### `warn(message, metadata)`

Logs warning message.

### `error(message, metadata)`

Logs error message.

### `logError(error, context)`

Logs error with full context.

### `logSystemMetrics()`

Logs current system metrics.

**Metric Categories:**
- Memory usage
- CPU usage  
- Active handles
- Event loop lag
- Cache statistics
- Worker pool status

## Error Handling

### Standard Error Response Format

```javascript
{
  success: false,
  error: {
    code: string,        // Error code (e.g., "INVALID_IMAGE", "API_TIMEOUT")
    message: string,     // Human-readable message
    details: Object,     // Additional error context
    timestamp: Date,     // Error occurrence time
    requestId: string    // Request identifier
  }
}
```

### Common Error Codes

- `INVALID_IMAGE` - Image format or size issues
- `OCR_FAILED` - OCR processing failure
- `API_TIMEOUT` - External API timeout
- `API_RATE_LIMIT` - Rate limit exceeded
- `NO_MATCHES_FOUND` - No match results found
- `PARSING_ERROR` - Text parsing failure
- `VALIDATION_ERROR` - Input validation failure
- `CACHE_ERROR` - Cache operation failure
- `WORKER_POOL_FULL` - All OCR workers busy

### Error Recovery Strategies

1. **Automatic Retry** - Transient failures (network, timeout)
2. **Fallback APIs** - Primary API failures  
3. **Degraded Service** - Partial functionality when possible
4. **Graceful Failure** - Clear error messages to user

This API reference provides comprehensive coverage of all service interfaces, enabling effective integration, testing, and extension of the bot's functionality.
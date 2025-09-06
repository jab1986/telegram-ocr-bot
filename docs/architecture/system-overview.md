# System Architecture Overview

## System Design Philosophy

The Telegram OCR Betting Slip Bot is designed with a modular, service-oriented architecture that prioritizes:

- **Reliability**: Multi-tier fallback systems and robust error handling
- **Performance**: Concurrent processing and intelligent caching
- **Maintainability**: Clear separation of concerns and modular design
- **Scalability**: Worker pools and configurable concurrency limits

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram API  │    │  External APIs  │    │  OCR Services   │
│                 │    │                 │    │                 │
│  • Bot Updates  │    │ • Football API  │    │ • Tesseract.js  │
│  • User Messages│    │ • Goal.com      │    │ • Worker Pool   │
│  • Image Upload │    │ • TheSportsDB   │    │ • Text Parsing  │
└─────────────────┘    │ • Brave Search  │    └─────────────────┘
         │              └─────────────────┘             │
         │                       │                      │
         ▼                       ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Telegram Bot   │  │ Match Result    │  │ Betting Slip    │ │
│  │   Service       │  │   Service       │  │   Analyzer      │ │
│  │                 │  │                 │  │                 │ │
│  │ • Message       │  │ • API           │  │ • OCR           │ │
│  │   Processing    │  │   Orchestration │  │   Processing    │ │
│  │ • Command       │  │ • Result        │  │ • Text Parsing  │ │
│  │   Handling      │  │   Aggregation   │  │ • Selection     │ │
│  │ • Response      │  │ • Confidence    │  │   Extraction    │ │
│  │   Generation    │  │   Scoring       │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                       │                      │
         ▼                       ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                        │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Caching      │  │    Logging      │  │   Validation    │ │
│  │   Service       │  │   Service       │  │   Service       │ │
│  │                 │  │                 │  │                 │ │
│  │ • Memory Cache  │  │ • Structured    │  │ • Input         │ │
│  │ • TTL           │  │   Logging       │  │   Validation    │ │
│  │ • Statistics    │  │ • Error         │  │ • Data          │ │
│  │ • Cleanup       │  │   Tracking      │  │   Sanitization  │ │
│  └─────────────────┘  │ • Metrics       │  │ • Type Checking │ │
│                       └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Application Entry Point (`src/app.js`)
**Purpose**: Orchestrates service initialization and application lifecycle management.

**Key Responsibilities**:
- Service initialization and dependency injection
- Graceful shutdown handling
- Configuration summary display
- System metrics monitoring (development mode)

**Error Handling**:
- Uncaught exception handling
- Unhandled promise rejection handling
- Process signal handling (SIGINT, SIGTERM)

### 2. Telegram Bot Service (`src/bot/telegramBot.js`)
**Purpose**: Manages Telegram API interactions and user communication.

**Key Features**:
- Message routing and command processing
- Image handling and validation
- User session management
- Rate limiting and flood protection

**Integration Points**:
- Betting Slip Analyzer for OCR processing
- Match Result Service for data fetching
- Validation Service for input checking

### 3. Betting Slip Analyzer (`src/services/bettingSlipAnalyzer.js`)
**Purpose**: Processes betting slip images and extracts structured bet data.

**Core Algorithm**:
1. **OCR Text Extraction** - Tesseract.js with optimized settings
2. **Anchor-based Parsing** - Identifies bet selection boundaries
3. **Data Structure Mapping** - Converts text to structured bet objects
4. **Validation and Confidence Scoring** - Quality assessment

**Parsing Strategy**:
```javascript
// Anchor Detection Algorithm
const anchors = [...knownTeams, ...bettingMarkets];
lines.forEach(line => {
    if (isAnchor(line)) {
        processPreviousSelection(currentLines);
        startNewSelection(line);
    } else {
        currentLines.push(line);
    }
});
```

### 4. Match Result Service (`src/services/matchResultService.js`)
**Purpose**: Fetches match results from multiple APIs with intelligent fallback.

**API Priority Hierarchy**:
1. **Football API** - Primary source (premium data, 1,100+ leagues)
2. **Goal.com** - Web scraping with JSON-LD parsing
3. **TheSportsDB** - Free sports database
4. **Brave Search** - Web search fallback for lower leagues

**Concurrency Management**:
- Configurable batch processing
- Promise.allSettled for parallel execution
- Circuit breaker pattern for failed APIs

## Data Flow Architecture

### 1. Image Processing Pipeline

```
User Image → Telegram API → Bot Service → OCR Worker Pool
     ↓
Text Lines → Anchor Detection → Selection Grouping → Regex Parsing
     ↓
Structured Bet Data → Validation → Cache Check → API Orchestration
```

### 2. Match Result Pipeline

```
Bet Selections → Parallel API Calls → Result Aggregation
     ↓
Confidence Scoring → Cache Storage → Response Generation
     ↓
Result Analysis → Win/Loss Calculation → User Response
```

## Configuration Management

### Environment-Based Configuration
- **Development**: Debug logging, detailed metrics, reduced timeouts
- **Production**: Optimized logging, performance monitoring, security hardening

### Configuration Layers
1. **Default Values** - Built-in fallbacks
2. **Environment Variables** - Runtime configuration
3. **Runtime Overrides** - Dynamic adjustments

## Performance Architecture

### Caching Strategy
- **Memory-based caching** with TTL expiration
- **Intelligent cache keys** for optimal hit rates
- **Statistics tracking** for performance monitoring

### Worker Pool Management
- **OCR Worker Pool** - Dedicated Tesseract instances
- **Configurable pool size** - Based on system resources
- **Load balancing** - Even distribution of OCR tasks

### Concurrent Processing
- **Batch processing** for multiple selections
- **Configurable concurrency limits**
- **Resource-aware scheduling**

## Security Architecture

### Input Validation
- **Image size limits** - Prevents DoS attacks
- **Format validation** - Ensures supported image types
- **Content sanitization** - Removes potentially harmful content

### API Security
- **Rate limiting** - Prevents API abuse
- **Token validation** - Secure API key management
- **Request timeout** - Prevents hanging requests

### Error Information Disclosure
- **Sanitized error messages** - No sensitive information exposure
- **Structured logging** - Security event tracking
- **Graceful degradation** - Maintains service availability

## Monitoring and Observability

### Metrics Collection
- **Request/response times**
- **API call success rates**
- **Cache hit/miss ratios**
- **OCR processing statistics**
- **Error frequencies and types**

### Logging Strategy
- **Structured JSON logging**
- **Context-aware log entries**
- **Performance metrics integration**
- **Error correlation tracking**

## Scalability Considerations

### Horizontal Scaling
- **Stateless service design** - No local state dependencies
- **External cache integration ready** - Redis/Memcached support
- **Load balancer compatible** - Standard HTTP health checks

### Vertical Scaling
- **Resource-aware worker pools**
- **Memory usage optimization**
- **CPU-intensive task distribution**

## Technology Decisions

### OCR Technology: Tesseract.js
**Rationale**: 
- Pure JavaScript implementation
- No system dependencies
- Good accuracy for betting slip text
- Configurable for specific use cases

### Node.js Runtime
**Rationale**:
- Excellent async I/O performance
- Rich ecosystem for image processing
- Simple deployment and scaling
- Strong community support

### In-Memory Caching
**Rationale**:
- Low latency access
- Simple implementation
- No external dependencies
- Suitable for moderate load

This architecture provides a solid foundation for reliable, performant betting slip analysis while maintaining flexibility for future enhancements and scaling requirements.
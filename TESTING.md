# Testing Strategy & Documentation

This document outlines the comprehensive testing strategy for the Telegram OCR Betting Slip Bot, including test types, coverage requirements, and execution procedures.

## Overview

The testing framework is built on **Jest** with additional tools for integration testing, performance monitoring, and security validation. The strategy focuses on critical functionality: OCR accuracy, betting slip parsing, API integration reliability, and end-to-end user workflows.

## Test Architecture

```
tests/
├── setup/
│   └── jest.setup.js           # Global test configuration
├── fixtures/
│   ├── betting-slips.js        # OCR text samples and expected results
│   └── match-results.js        # API response mocks and test data
├── unit/
│   └── services/
│       ├── bettingSlipAnalyzer.test.js    # OCR parsing logic
│       └── matchResultService.test.js      # API integration
├── integration/
│   ├── betting-slip-workflow.test.js      # End-to-end analysis flow
│   └── api-fallback.test.js               # Fallback mechanism testing
├── performance/
│   └── ocr-performance.test.js            # Load and performance testing
├── security/
│   └── input-validation.test.js           # Security and validation tests
└── e2e/
    └── telegram-bot.test.js               # Complete user interaction flows
```

## Test Categories

### 1. Unit Tests (`npm run test:unit`)

**Purpose**: Test individual components in isolation

**Coverage**:
- ✅ **Betting Slip Analyzer**: OCR text parsing, anchor detection, selection extraction
- ✅ **Match Result Service**: API integration, caching, result determination
- ✅ **Utility Functions**: Team name normalization, date parsing, validation

**Key Test Cases**:
- Valid betting slip parsing (single/multiple selections)
- Edge cases: malformed input, poor OCR quality, missing data
- API response processing and error handling
- Caching behavior and performance optimization

**Quality Gates**: 80% line coverage, 70% branch coverage

### 2. Integration Tests (`npm run test:integration`)

**Purpose**: Test component interactions and workflows

**Coverage**:
- ✅ **Complete Analysis Workflow**: OCR → Parsing → API calls → Result determination
- ✅ **API Fallback Mechanisms**: Primary failure → Secondary source → Final result
- ✅ **Data Flow Integrity**: Consistent data through all processing stages

**Key Scenarios**:
- Successful end-to-end betting slip analysis
- Mixed win/loss results with accurate determination
- API failures with graceful fallback to secondary sources
- Performance under concurrent request load

### 3. Performance Tests (`npm run test:performance`)

**Purpose**: Validate system performance and scalability

**Coverage**:
- ✅ **OCR Processing Speed**: <50ms per simple slip, <100ms per complex slip
- ✅ **Memory Usage**: <50MB increase during sustained load
- ✅ **Concurrent Processing**: Handle 50+ simultaneous requests
- ✅ **Scalability**: Sub-linear performance degradation with increasing complexity

**Benchmarks**:
- Single selection analysis: <50ms
- Multiple selection analysis: <100ms
- Large betting slip (20 selections): <1000ms
- Concurrent requests (50): <30 seconds total

### 4. Security Tests (`npm run test:security`)

**Purpose**: Protect against malicious inputs and security vulnerabilities

**Coverage**:
- ✅ **Input Sanitization**: Script injection, SQL injection patterns, path traversal
- ✅ **DoS Protection**: Regex bombing, memory exhaustion, infinite loops
- ✅ **Data Validation**: Type confusion, numeric overflow, malformed input
- ✅ **Environment Security**: API key validation, error disclosure prevention

**Attack Vectors Tested**:
- XSS attempts in OCR text
- Path traversal in team names  
- Regex catastrophic backtracking
- Memory exhaustion attempts
- Environment variable injection

### 5. End-to-End Tests (`npm run test:e2e`)

**Purpose**: Simulate complete user interactions with the Telegram bot

**Coverage**:
- ✅ **Bot Initialization**: Token validation, command registration
- ✅ **User Commands**: /start, /ping, /debug functionality
- ✅ **Image Processing**: Photo upload → OCR → Analysis → Response
- ✅ **Error Handling**: Network failures, invalid inputs, processing errors

**User Flows Tested**:
- New user onboarding (/start command)
- Successful betting slip analysis
- Non-betting slip image handling
- Error scenarios and recovery

## Test Data & Fixtures

### Betting Slip Fixtures (`tests/fixtures/betting-slips.js`)

**Sample Types**:
- **Valid Multiple Selections**: 3-fold accumulator with different teams
- **Single Selection**: Simple win bet with clear fixture info
- **Yes/No Markets**: Both Teams To Score selections
- **With Boost**: Promotional boost applied to stake
- **Poor OCR Quality**: Typos and character recognition errors
- **International Teams**: European and non-English team names
- **Over/Under Markets**: Total goals betting markets
- **High Odds Accumulator**: Long-shot accumulator bets

### API Response Fixtures (`tests/fixtures/match-results.js`)

**Mock Data Sources**:
- **Football API**: Team search responses, fixture data, match results
- **Goal.com**: HTML pages with JSON-LD structured data
- **TheSportsDB**: Team and event data from alternative API
- **Brave Search**: Web search results with score extraction
- **Error Responses**: Rate limiting, authentication failures, network errors

## Quality Gates & Coverage Requirements

### Coverage Thresholds
```json
{
  "global": {
    "branches": 70,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}
```

### Performance Requirements
- **OCR Processing**: <100ms average for complex betting slips
- **API Response**: <5s total for match result fetching
- **Memory Usage**: <100MB peak during testing
- **Concurrent Load**: Handle 50 simultaneous requests

### Security Requirements
- **Input Validation**: 100% malicious input rejection
- **Error Handling**: No sensitive information disclosure
- **API Security**: Proper authentication and rate limiting

## Execution

### Quick Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:performance    # Performance tests only
npm run test:security       # Security tests only
npm run test:e2e           # End-to-end tests only

# Coverage and reporting
npm run test:coverage       # Generate coverage report
npm run test:watch          # Watch mode for development
npm run test:ci            # CI-optimized execution
```

### Comprehensive Test Script

Use the comprehensive test runner for full validation:

```bash
# Run all tests with full reporting
./scripts/run-tests.sh

# Run specific test types
./scripts/run-tests.sh unit
./scripts/run-tests.sh integration
./scripts/run-tests.sh performance
./scripts/run-tests.sh security
./scripts/run-tests.sh e2e
./scripts/run-tests.sh coverage
```

### CI/CD Integration

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. **Security Audit**: Dependency vulnerabilities, package validation
2. **Code Quality**: ESLint, formatting, JSON validation
3. **Multi-Version Testing**: Node.js 18.x and 20.x compatibility
4. **Parallel Execution**: Unit, integration, performance, security tests
5. **Quality Gate**: All tests must pass before merge approval
6. **Reporting**: Coverage upload, test artifacts, quality reports

## Test Environment Setup

### Required Environment Variables

```bash
# Required for testing
NODE_ENV=test
TELEGRAM_BOT_TOKEN=test_token_123456789
FOOTBALL_API_KEY=test_football_api_key
BRAVE_API_KEY=test_brave_api_key

# Optional for enhanced testing
TEST_DEBUG=true                # Enable debug logging
TEST_TIMEOUT=30000            # Global test timeout (ms)
```

### Dependencies

The testing framework uses these key dependencies:

```json
{
  "jest": "^29.7.0",           # Main testing framework
  "nock": "^13.5.1",           # HTTP request mocking
  "supertest": "^6.3.4",       # HTTP assertion testing
  "canvas": "^2.11.2",         # Image processing for tests
  "@jest/globals": "^29.7.0"   # Jest global utilities
}
```

## Best Practices

### Writing Tests

1. **Test Structure**: Arrange-Act-Assert pattern
2. **Descriptive Names**: Clear test case descriptions
3. **Isolation**: Each test should run independently
4. **Mocking**: Mock external dependencies appropriately
5. **Edge Cases**: Test boundary conditions and error scenarios

### Test Data Management

1. **Fixtures**: Use centralized test data files
2. **Realistic Data**: Base test cases on real betting slips
3. **Edge Cases**: Include malformed and edge case data
4. **Maintainability**: Keep test data organized and documented

### Performance Considerations

1. **Parallel Execution**: Leverage Jest's parallel capabilities
2. **Resource Cleanup**: Properly clean up mocks and resources
3. **Timeout Management**: Set appropriate timeouts for different test types
4. **Memory Monitoring**: Watch for memory leaks in long-running tests

## Debugging Tests

### Local Debugging

```bash
# Run tests with debug output
TEST_DEBUG=true npm test

# Run specific test file
npm test -- tests/unit/services/bettingSlipAnalyzer.test.js

# Run tests in watch mode
npm run test:watch

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Common Issues

1. **Mock Not Working**: Ensure mocks are properly cleared between tests
2. **Timeout Errors**: Increase timeout for slow operations
3. **Network Issues**: Check that nock interceptors match actual requests
4. **Coverage Gaps**: Use `npm run test:coverage` to identify uncovered code

## Maintenance

### Regular Tasks

1. **Update Test Data**: Keep betting slip fixtures current with real examples
2. **Review Coverage**: Maintain coverage above quality gates
3. **Performance Monitoring**: Watch for performance regressions
4. **Security Updates**: Keep security test patterns current with new threats

### When Adding New Features

1. **Unit Tests**: Add tests for new functions/methods
2. **Integration Tests**: Test feature integration with existing system
3. **Fixtures**: Add test data for new scenarios
4. **Documentation**: Update this document with new test coverage

## Reporting

Test execution generates several reports:

- **Coverage Report**: `coverage/lcov-report/index.html`
- **Test Results**: Console output with pass/fail summary
- **Performance Metrics**: Response times and memory usage
- **Quality Report**: `test-report.md` with comprehensive results

---

**Quality Assurance**: This testing strategy ensures the Telegram OCR Betting Slip Bot maintains high reliability, security, and performance standards through comprehensive automated validation.
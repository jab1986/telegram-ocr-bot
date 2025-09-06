# Contributing Guide

## Welcome Contributors

We welcome contributions to the Telegram OCR Betting Slip Bot project! This guide provides everything you need to know to contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Documentation Standards](#documentation-standards)
- [Community Guidelines](#community-guidelines)

## Code of Conduct

### Our Standards

- **Be respectful**: Treat all community members with respect
- **Be inclusive**: Welcome new contributors and different perspectives
- **Be constructive**: Provide helpful feedback and suggestions
- **Be professional**: Maintain a professional tone in all interactions
- **Be patient**: Help newcomers learn and contribute effectively

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or inflammatory comments
- Spamming or off-topic discussions
- Sharing private information without consent

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/telegram-bot-superclaude.git
cd telegram-bot-superclaude

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/telegram-bot-superclaude.git
```

### 2. Set Up Development Environment

Follow the complete [Development Setup Guide](./development-setup.md):

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your development settings

# Verify setup
npm test
npm run lint
```

### 3. Choose Your Contribution Type

**Bug Fixes**:
- Look for issues labeled `bug` or `good first issue`
- Reproduce the issue locally
- Create focused fix with tests

**Feature Development**:
- Check existing issues and roadmap
- Discuss new features in issues first
- Design with service architecture in mind

**Documentation**:
- Improve existing documentation
- Add missing documentation sections
- Fix typos and formatting issues

**Testing**:
- Improve test coverage
- Add integration tests
- Performance and security testing

## Development Process

### 1. Issue-First Development

Always start with an issue:

```bash
# Search existing issues first
# If no issue exists, create one
# Discuss approach before starting work
```

**Issue Template**:
```markdown
**Issue Type**: Bug/Feature/Documentation/Other

**Description**: 
Clear description of the issue or feature request

**Current Behavior** (for bugs):
What currently happens

**Expected Behavior**:
What should happen

**Steps to Reproduce** (for bugs):
1. Step one
2. Step two
3. Step three

**Environment**:
- Node.js version:
- Operating System:
- Bot version:

**Additional Context**:
Any other relevant information
```

### 2. Branch Naming Convention

```bash
# Bug fixes
git checkout -b fix/issue-123-ocr-timeout-error

# New features
git checkout -b feature/issue-456-add-new-language-support

# Documentation
git checkout -b docs/issue-789-improve-api-documentation

# Refactoring
git checkout -b refactor/issue-101-improve-cache-service
```

### 3. Commit Message Format

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Build process or auxiliary tool changes

**Examples**:
```bash
git commit -m "feat(ocr): add support for multi-language text extraction"
git commit -m "fix(api): handle rate limiting errors gracefully"
git commit -m "docs(user-guide): add troubleshooting section for common OCR issues"
git commit -m "test(betting-analyzer): add unit tests for anchor detection"
```

## Coding Standards

### 1. JavaScript Style Guide

**ESLint Configuration**: The project uses ESLint with the following key rules:

```javascript
// Use const for immutable values
const config = require('./config');

// Use let for mutable values
let processedCount = 0;

// Prefer arrow functions for callbacks
array.map(item => item.transform());

// Use async/await over Promises
async function processImage(buffer) {
  try {
    const result = await ocrService.process(buffer);
    return result;
  } catch (error) {
    logger.error('OCR processing failed', error);
    throw error;
  }
}

// Use destructuring where appropriate
const { team, odds, confidence } = selection;

// Use template literals for string interpolation
logger.info(`Processing selection: ${team} @ ${odds}`);
```

**Naming Conventions**:
- **Variables/Functions**: `camelCase`
- **Classes**: `PascalCase`  
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `camelCase.js` for modules, `PascalCase.js` for classes

```javascript
// Good examples
const maxRetries = 3;
const API_BASE_URL = 'https://api.example.com';

class BettingSlipAnalyzer {
  constructor(config) {
    this.processingTimeout = config.timeout;
  }
  
  async analyzeSelection(ocrText) {
    // Implementation
  }
}
```

### 2. Service Architecture Patterns

**Dependency Injection**:
```javascript
class ServiceExample {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.cache = dependencies.cache;
    this.config = dependencies.config;
  }
}
```

**Error Handling Pattern**:
```javascript
async function serviceMethod(input) {
  try {
    const result = await processInput(input);
    return { success: true, data: result };
  } catch (error) {
    logger.logError(error, {
      operation: 'serviceMethod',
      input: sanitizeInput(input)
    });
    
    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        context: { operation: 'serviceMethod' }
      }
    };
  }
}
```

**Configuration Pattern**:
```javascript
// Use environment configuration consistently
const timeout = config.get('ocr.timeout');
const poolSize = config.get('ocr.workerPoolSize');

// Don't hardcode values
// ❌ Bad
const TIMEOUT = 30000;

// ✅ Good
const timeout = config.get('ocr.timeout') || 30000;
```

### 3. Documentation Standards

**JSDoc Comments**:
```javascript
/**
 * Analyzes betting slip text and extracts selections
 * @param {string} ocrText - Raw OCR text from betting slip image
 * @param {Object} options - Processing options
 * @param {number} [options.confidence=0.8] - Minimum confidence threshold
 * @returns {Promise<BettingSlipAnalysis>} Analysis results with selections
 * @throws {Error} When OCR text is invalid or processing fails
 * 
 * @example
 * const analyzer = new BettingSlipAnalyzer();
 * const result = await analyzer.analyze('Liverpool\n1.28\nFull Time Result');
 * console.log(result.selections); // [{ team: 'Liverpool', odds: 1.28, ... }]
 */
async analyze(ocrText, options = {}) {
  // Implementation
}
```

## Testing Requirements

### 1. Test Coverage Requirements

**Minimum Coverage**:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Statements**: 80%

```bash
# Check coverage
npm run test:coverage

# Coverage must pass before PR acceptance
```

### 2. Test Types Required

**Unit Tests** (Required for all new code):
```javascript
describe('BettingSlipAnalyzer', () => {
  let analyzer;
  
  beforeEach(() => {
    analyzer = new BettingSlipAnalyzer();
  });
  
  test('should extract team names from OCR text', async () => {
    const ocrText = 'Liverpool\n1.28\nFull Time Result';
    const result = await analyzer.analyze(ocrText);
    
    expect(result.selections).toHaveLength(1);
    expect(result.selections[0].team).toBe('Liverpool');
    expect(result.selections[0].odds).toBe(1.28);
  });
  
  test('should handle invalid OCR text gracefully', async () => {
    const result = await analyzer.analyze('');
    
    expect(result.isBettingSlip).toBe(false);
    expect(result.selections).toHaveLength(0);
  });
});
```

**Integration Tests** (Required for API changes):
```javascript
describe('Match Result Service Integration', () => {
  test('should fetch results from multiple APIs', async () => {
    const selections = [{ team: 'Liverpool', opponent: 'Chelsea' }];
    const results = await matchResultService.fetchMatchResults(selections);
    
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('result');
    expect(results[0]).toHaveProperty('source');
  });
});
```

**Error Handling Tests** (Required):
```javascript
test('should handle API timeout errors', async () => {
  // Mock timeout
  nock('https://api.example.com')
    .get('/match-results')
    .replyWithError({ code: 'ETIMEDOUT' });
    
  const result = await service.fetchResults();
  
  expect(result.success).toBe(false);
  expect(result.error.code).toBe('API_TIMEOUT');
});
```

### 3. Test Best Practices

**Use Descriptive Test Names**:
```javascript
// ❌ Bad
test('should work', () => {});

// ✅ Good
test('should extract odds from betting slip when text is clearly formatted', () => {});
```

**Test Edge Cases**:
```javascript
test.each([
  ['empty string', ''],
  ['null input', null],
  ['undefined input', undefined],
  ['very long text', 'x'.repeat(10000)]
])('should handle %s gracefully', async (description, input) => {
  const result = await service.process(input);
  expect(result).toBeDefined();
});
```

**Mock External Dependencies**:
```javascript
// Mock HTTP requests
const nock = require('nock');

beforeEach(() => {
  nock('https://api.football.com')
    .get('/teams/search')
    .query({ name: 'Liverpool' })
    .reply(200, { teams: [{ id: 1, name: 'Liverpool FC' }] });
});
```

## Pull Request Process

### 1. Pre-Submit Checklist

Before submitting your PR:

- [ ] **Code Quality**
  - [ ] All tests pass (`npm test`)
  - [ ] Linting passes (`npm run lint`)
  - [ ] Code coverage meets requirements
  - [ ] No console.log statements in production code

- [ ] **Documentation**
  - [ ] Code changes documented with JSDoc
  - [ ] README updated if needed
  - [ ] API documentation updated if interfaces changed
  - [ ] User-facing changes documented

- [ ] **Testing**  
  - [ ] Unit tests for new functionality
  - [ ] Integration tests for API changes
  - [ ] Error handling tests included
  - [ ] Edge cases covered

- [ ] **Security**
  - [ ] No sensitive data in code
  - [ ] Input validation for user data
  - [ ] No new security vulnerabilities

### 2. Pull Request Template

```markdown
## Description
Brief description of the changes and why they're needed.

Fixes #issue_number

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How Has This Been Tested?
Describe the tests that you ran to verify your changes:
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Performance testing

## Screenshots/Logs (if applicable)
Include any relevant screenshots or log outputs

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### 3. Code Review Process

**Review Criteria**:
- Code quality and style consistency
- Test coverage and quality
- Documentation completeness
- Performance impact
- Security considerations
- Architecture alignment

**Review Timeline**:
- Initial review within 48 hours
- Follow-up reviews within 24 hours
- Approval requires 1+ maintainer approval

## Documentation Standards

### 1. Code Documentation

**JSDoc for Public APIs**:
```javascript
/**
 * Service for analyzing betting slip images using OCR
 * @class
 * @example
 * const analyzer = new BettingSlipAnalyzer(config);
 * const result = await analyzer.analyze(ocrText);
 */
class BettingSlipAnalyzer {
  /**
   * Creates a new analyzer instance
   * @param {Object} config - Configuration object
   * @param {string[]} config.knownTeams - List of known team names
   * @param {number} config.confidenceThreshold - Minimum confidence for parsing
   */
  constructor(config) {
    // Implementation
  }
}
```

**README Updates**:
- Update installation instructions if dependencies change
- Update usage examples if API changes
- Update feature list for new functionality
- Keep troubleshooting section current

### 2. User Documentation

**Update User Guide**:
- New commands or features
- Changed behavior or workflows
- New troubleshooting scenarios
- Updated image requirements

**API Documentation**:
- New service interfaces
- Changed method signatures
- New error codes or responses
- Updated examples

## Community Guidelines

### 1. Issue Triage

**Labels Used**:
- `bug`: Confirmed bugs
- `enhancement`: New features
- `good first issue`: Beginner-friendly
- `help wanted`: Community help requested
- `documentation`: Documentation improvements
- `question`: Support questions

### 2. Communication

**Preferred Channels**:
- **GitHub Issues**: Bug reports, feature requests, technical discussion
- **Pull Requests**: Code review and implementation discussion
- **Discussions**: General questions and community support

**Response Time Expectations**:
- Issues: Response within 3-5 business days
- Pull Requests: Initial review within 48 hours
- Critical bugs: Response within 24 hours

### 3. Recognition

**Contributors Recognition**:
- Contributors added to project README
- Significant contributions highlighted in releases
- Community contributions celebrated

Thank you for contributing to the Telegram OCR Betting Slip Bot project! Your contributions help make the project better for everyone.
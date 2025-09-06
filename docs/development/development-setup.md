# Development Setup Guide

## Prerequisites

### Required Software

**Node.js and npm**:
- **Version**: Node.js 18.0.0 or higher (LTS recommended)
- **Installation**: Download from [nodejs.org](https://nodejs.org/) or use version manager
- **Verification**: `node --version && npm --version`

**Git**:
- **Purpose**: Version control and repository cloning
- **Installation**: [git-scm.com](https://git-scm.com/) or package manager
- **Configuration**: Set up user name and email

**Code Editor**:
- **Recommended**: Visual Studio Code with extensions
- **Alternatives**: WebStorm, Sublime Text, Atom
- **Extensions**: ESLint, Prettier, Node.js debugging support

### Development Environment Setup

#### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-username/telegram-bot-superclaude.git
cd telegram-bot-superclaude

# Verify project structure
ls -la
```

Expected directory structure:
```
telegram-bot-superclaude/
├── src/                 # Application source code
├── tests/               # Test suites
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── package.json         # Node.js dependencies
├── .env.example         # Environment template
├── .gitignore          # Git ignore rules
└── README.md           # Project overview
```

#### 2. Install Dependencies

```bash
# Install all dependencies (development and production)
npm install

# Verify installation
npm list --depth=0
```

**Core Dependencies**:
- `tesseract.js` - OCR processing
- `node-telegram-bot-api` - Telegram API integration
- `cheerio` - HTML parsing for web scraping
- `undici` - Fast HTTP client
- `dotenv` - Environment variable management

**Development Dependencies**:
- `jest` - Testing framework
- `eslint` - Code linting
- `supertest` - HTTP testing
- `nock` - HTTP request mocking

#### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or use your preferred editor
```

**Development Environment Variables**:
```bash
# Required for basic functionality
TELEGRAM_BOT_TOKEN=your_development_bot_token
NODE_ENV=development

# API Keys (optional for development)
FOOTBALL_API_KEY=your_football_api_key
BRAVE_API_KEY=your_brave_api_key

# Development-specific settings
LOG_LEVEL=debug
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=false

# OCR Configuration
OCR_WORKER_POOL_SIZE=2
OCR_TIMEOUT=30000
MAX_IMAGE_SIZE_MB=10

# Caching Configuration
CACHE_ENABLED=true
CACHE_TTL_MINUTES=30
CACHE_MAX_ENTRIES=500

# Rate Limiting (relaxed for development)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Performance Settings
CONCURRENT_PROCESSING=1
REQUEST_TIMEOUT=10000
```

### Telegram Bot Setup for Development

#### 1. Create Development Bot

```bash
# Start conversation with @BotFather on Telegram
/newbot

# Follow prompts to create bot:
# Bot name: Your Bot Name Development
# Bot username: your_bot_dev_bot (must end with 'bot')

# Save the bot token provided by @BotFather
```

#### 2. Configure Development Bot

```bash
# Set bot description
/setdescription
# Select your bot
# Enter description: Development version of OCR Betting Slip Bot

# Set bot commands
/setcommands
# Select your bot
# Enter commands:
start - Start the bot and show welcome message
ping - Test bot connectivity
stats - Show performance statistics
help - Get help and usage tips
```

## Development Workflow

### 1. Initial Verification

```bash
# Run tests to verify setup
npm test

# Check code style
npm run lint

# Start development server
npm run start:dev
```

**Expected Output**:
```
🚀 Starting Telegram OCR Betting Slip Bot...
Environment: development
Configuration loaded {
  "ocrWorkers": 2,
  "cacheEnabled": true,
  "logLevel": "debug"
}
✅ Application started successfully
```

### 2. Code Organization

**Source Code Structure**:
```
src/
├── app.js                 # Application entry point
├── config/
│   └── environment.js     # Configuration management
├── services/
│   ├── bettingSlipAnalyzer.js  # OCR and parsing logic
│   ├── matchResultService.js   # API integration
│   ├── ocrWorkerPool.js       # OCR worker management
│   ├── cacheService.js        # Caching layer
│   ├── validationService.js   # Input validation
│   └── loggingService.js      # Logging system
└── bot/
    └── telegramBot.js     # Telegram bot interface
```

**Test Structure**:
```
tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
├── performance/           # Performance tests
├── security/             # Security tests
├── e2e/                  # End-to-end tests
├── fixtures/             # Test data
└── setup/                # Test configuration
```

### 3. Development Scripts

**Available npm Scripts**:

```bash
# Development
npm run start:dev          # Start with development logging
npm run start:legacy       # Start legacy version (bot.js)

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report

# Code Quality
npm run lint               # Check code style
npm run lint:fix           # Auto-fix style issues

# Maintenance
npm run clean              # Clean logs and cache
npm run stats              # Show cache statistics
```

### 4. Development Best Practices

**Code Style Guidelines**:
- Use ESLint configuration provided in `package.json`
- Follow Node.js naming conventions (camelCase for variables, PascalCase for classes)
- Use async/await instead of callbacks
- Add comprehensive error handling
- Include JSDoc comments for complex functions

**Testing Guidelines**:
- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Mock external dependencies appropriately
- Test both success and error scenarios

**Git Workflow**:
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add feature: descriptive commit message"

# Push and create pull request
git push origin feature/your-feature-name
```

## Development Tools and Extensions

### Visual Studio Code Extensions

**Essential Extensions**:
- **ESLint**: Real-time linting and error detection
- **Prettier**: Code formatting
- **Node.js Extension Pack**: Debugging and IntelliSense
- **Jest**: Test runner integration
- **GitLens**: Enhanced Git functionality
- **REST Client**: API testing

**Configuration** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.autoFixOnSave": true,
  "jest.autoRun": "watch",
  "files.associations": {
    "*.md": "markdown"
  }
}
```

### Debugging Configuration

**Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Bot",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "test"
      }
    }
  ]
}
```

## Local Testing

### 1. Unit Testing

```bash
# Run specific test files
npm test -- --testPathPattern="bettingSlipAnalyzer"

# Run tests with debug output
DEBUG=* npm test

# Generate detailed coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### 2. Integration Testing

```bash
# Test with real Telegram bot (requires valid token)
npm run test:integration

# Test API integrations (requires API keys)
FOOTBALL_API_KEY=your_key npm run test:integration
```

### 3. Manual Testing

**Test Image Processing**:
1. Start development bot: `npm run start:dev`
2. Send test images to your development bot
3. Monitor console output for debugging information
4. Check `logs/` directory for detailed logs

**Test Commands**:
```bash
# Send to your development bot via Telegram:
/start
/ping
/stats
/help
```

### 4. Performance Testing

```bash
# Run performance benchmarks
npm run test:performance

# Profile memory usage
node --inspect src/app.js
# Open Chrome DevTools for memory profiling
```

## Debugging Techniques

### 1. Console Debugging

**Add Debug Statements**:
```javascript
// In development, use detailed logging
if (config.isDevelopment()) {
  console.log('Debug: Processing selection:', selection);
  console.log('Debug: API response:', response);
}

// Use structured logging
logger.debug('Selection processed', {
  team: selection.team,
  odds: selection.odds,
  confidence: selection.confidence
});
```

### 2. Breakpoint Debugging

**Set Breakpoints**:
- Use VS Code debugger with launch configuration
- Set breakpoints in source code
- Inspect variables and call stack
- Step through code execution

### 3. API Testing

**Test External APIs**:
```javascript
// Create test script for API integration
const matchService = require('./src/services/matchResultService');

async function testAPI() {
  const results = await matchService.searchFootballAPI('Liverpool', 'Chelsea', '2025-09-05');
  console.log('API Results:', results);
}

testAPI().catch(console.error);
```

## Contribution Guidelines

### 1. Code Review Process

**Before Submitting**:
- [ ] All tests pass (`npm test`)
- [ ] Code follows style guidelines (`npm run lint`)
- [ ] Changes are properly documented
- [ ] Commit messages are descriptive
- [ ] Branch is up to date with main

### 2. Documentation Updates

**Required Documentation**:
- Update relevant `.md` files for feature changes
- Add JSDoc comments for new functions
- Update API documentation for interface changes
- Include usage examples for new features

### 3. Testing Requirements

**New Feature Checklist**:
- [ ] Unit tests for core logic
- [ ] Integration tests for API interactions
- [ ] Error handling tests
- [ ] Performance impact assessment
- [ ] Security consideration review

## Troubleshooting Development Issues

### Common Setup Issues

**Node.js Version Conflicts**:
```bash
# Use Node Version Manager (nvm)
nvm install 18
nvm use 18
npm install
```

**Permission Errors**:
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm
```

**Tesseract Dependencies**:
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS with Homebrew
brew install tesseract
```

### Runtime Issues

**Environment Variable Problems**:
- Verify `.env` file exists and contains required variables
- Check file encoding (UTF-8 without BOM)
- Ensure no trailing spaces in variable values

**API Connection Issues**:
- Verify API keys are valid and not expired
- Check network connectivity and firewall settings
- Review rate limiting and quota restrictions

**OCR Processing Errors**:
- Verify Tesseract installation
- Check image file permissions and accessibility
- Monitor memory usage during processing

This development setup guide provides everything needed to start contributing to the Telegram OCR Betting Slip Bot project.
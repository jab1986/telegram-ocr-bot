# Telegram OCR Betting Slip Bot - Documentation

Welcome to the comprehensive documentation for the Telegram OCR Betting Slip Bot. This project provides sophisticated betting slip analysis using OCR technology with multi-source match result integration.

## Documentation Structure

### 🏗️ Architecture Documentation
- **[System Architecture](./architecture/system-overview.md)** - High-level system design and components
- **[Service Architecture](./architecture/service-architecture.md)** - Detailed service layer documentation
- **[Data Flow](./architecture/data-flow.md)** - Request processing and data transformation
- **[Integration Architecture](./architecture/integration-architecture.md)** - External API integration design

### 🔌 API Documentation
- **[API Reference](./api/api-reference.md)** - Complete API documentation
- **[Service Interfaces](./api/service-interfaces.md)** - Internal service interfaces
- **[External APIs](./api/external-apis.md)** - Third-party API integration guide
- **[Error Handling](./api/error-handling.md)** - Error codes and handling strategies

### 🚀 Deployment Documentation
- **[Deployment Guide](./deployment/deployment-guide.md)** - Production deployment instructions
- **[Environment Configuration](./deployment/environment-setup.md)** - Environment variables and configuration
- **[Docker Deployment](./deployment/docker-deployment.md)** - Containerized deployment
- **[Monitoring Setup](./deployment/monitoring.md)** - Production monitoring and alerting

### 🔧 Troubleshooting
- **[Common Issues](./troubleshooting/common-issues.md)** - Frequently encountered problems
- **[Performance Tuning](./troubleshooting/performance-tuning.md)** - Optimization strategies
- **[Debugging Guide](./troubleshooting/debugging-guide.md)** - Debug techniques and tools
- **[Maintenance Procedures](./troubleshooting/maintenance.md)** - Regular maintenance tasks

### 📱 User Guide
- **[Bot Usage](./user-guide/bot-usage.md)** - How to use the Telegram bot
- **[Betting Slip Requirements](./user-guide/betting-slip-requirements.md)** - Image format and quality guidelines
- **[Command Reference](./user-guide/command-reference.md)** - Available bot commands
- **[FAQ](./user-guide/faq.md)** - Frequently asked questions

### 👨‍💻 Development Documentation
- **[Development Setup](./development/development-setup.md)** - Local development environment
- **[Code Style Guide](./development/code-style-guide.md)** - Coding standards and conventions
- **[Testing Strategy](./development/testing-strategy.md)** - Testing approach and guidelines
- **[Contributing Guide](./development/contributing.md)** - How to contribute to the project
- **[Extension Guide](./development/extension-guide.md)** - Adding new features and services

## Quick Start Links

### For Users
- **[Getting Started](./user-guide/bot-usage.md#getting-started)** - Start using the bot immediately
- **[Image Guidelines](./user-guide/betting-slip-requirements.md)** - Ensure optimal OCR results

### For Developers
- **[Development Setup](./development/development-setup.md)** - Set up local environment
- **[Architecture Overview](./architecture/system-overview.md)** - Understand the system design

### For Operations
- **[Deployment Guide](./deployment/deployment-guide.md)** - Deploy to production
- **[Monitoring Setup](./deployment/monitoring.md)** - Set up monitoring and alerts

## Project Overview

This Telegram bot processes betting slip images using:

- **OCR Processing** - Tesseract.js for text extraction
- **Multi-API Integration** - Football API, Goal.com, TheSportsDB, Brave Search
- **Intelligent Parsing** - Anchor-based bet selection parsing
- **Real-time Results** - Live match result fetching and analysis
- **Performance Optimization** - Caching, worker pools, and concurrent processing

## Key Features

- 📷 **Advanced OCR** - Optimized text extraction from betting slip images
- 🔄 **Multi-source Fallback** - 4-tier API hierarchy for maximum coverage
- ⚡ **High Performance** - Worker pools and intelligent caching
- 🛡️ **Robust Error Handling** - Comprehensive error management and recovery
- 📊 **Detailed Analytics** - Performance metrics and usage statistics
- 🔒 **Security Features** - Rate limiting, input validation, and secure token management

## Support and Community

- **Issues**: Report bugs and feature requests through GitHub Issues
- **Discussions**: Join project discussions for questions and ideas
- **Documentation**: This comprehensive documentation covers all aspects of the system

## Version Information

- **Current Version**: 2.0.0
- **Node.js**: >= 18.0.0
- **Documentation Last Updated**: 2025-09-05

For the most up-to-date information, please refer to the specific documentation sections linked above.
# Common Issues and Troubleshooting

## Quick Diagnostics

### Bot Status Check
```bash
# Check if bot is running
pm2 status telegram-bot-superclaude

# View recent logs
pm2 logs telegram-bot-superclaude --lines 50

# Monitor bot in real-time
pm2 monit
```

### Health Check Commands
Send these commands to your bot via Telegram:
- `/ping` - Basic connectivity test
- `/stats` - Performance and system statistics
- `/help` - User guidance and tips

## Bot Startup Issues

### Issue: Bot fails to start

**Error**: `Required environment variable TELEGRAM_BOT_TOKEN is not set`

**Cause**: Missing or invalid Telegram bot token

**Solution**:
```bash
# Check environment file exists
ls -la .env

# Verify token format (should be: NNNNNNNNNN:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)
grep TELEGRAM_BOT_TOKEN .env

# Test token with Telegram API
curl -X GET "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

**Prevention**: Always verify tokens with @BotFather before deployment

---

### Issue: Application crashes on startup

**Error**: `Error: Cannot find module 'tesseract.js'`

**Cause**: Missing dependencies or corrupted node_modules

**Solution**:
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify all dependencies are installed
npm ls --depth=0
```

**Alternative Solution** (for system-level Tesseract issues):
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract

# Verify installation
tesseract --version
```

---

### Issue: High memory usage or crashes

**Error**: `JavaScript heap out of memory`

**Cause**: Memory leaks or insufficient heap size

**Solution**:
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=2048"
npm start

# Monitor memory usage
pm2 show telegram-bot-superclaude

# Enable memory monitoring
pm2 restart telegram-bot-superclaude --max-memory-restart 1000M
```

**Long-term Solution**: Optimize OCR worker pool size and cache limits:
```bash
# In .env file
OCR_WORKER_POOL_SIZE=2
CACHE_MAX_ENTRIES=500
CONCURRENT_PROCESSING=1
```

## OCR Processing Issues

### Issue: "No text found in this image"

**Symptoms**: Bot returns empty OCR results for clear images

**Common Causes and Solutions**:

1. **Image Format Issues**:
```bash
# Check supported formats
echo "Supported: JPEG, PNG, WebP, GIF, BMP"
echo "File size limit: 10MB"
```

2. **OCR Worker Pool Problems**:
```bash
# Check worker pool status via bot stats
# Look for: "Available workers: 0"

# Restart to reset worker pool
pm2 restart telegram-bot-superclaude
```

3. **Tesseract Configuration Issues**:
```javascript
// Verify OCR settings in logs
// Should show: tessedit_char_whitelist, psm: 6, preserve_interword_spaces: 1
```

**Debugging Steps**:
```bash
# Enable debug logging
LOG_LEVEL=debug pm2 restart telegram-bot-superclaude

# Monitor OCR processing
pm2 logs telegram-bot-superclaude | grep "OCR"

# Test with simple text image
# Send a clear image with large text to verify basic OCR functionality
```

---

### Issue: Poor OCR accuracy

**Symptoms**: Incorrect team names, missing odds, garbled text

**Solution Strategy**:

1. **Image Quality Assessment**:
   - Minimum 800x600 resolution
   - High contrast between text and background
   - Even lighting without shadows or glare
   - Sharp focus on all text areas

2. **OCR Optimization**:
```bash
# In .env file, adjust OCR settings
OCR_TIMEOUT=45000  # Increase processing time
MAX_IMAGE_SIZE_MB=15  # Allow larger images

# Check current OCR confidence in bot response
# Look for: "OCR Confidence: XX.X%"
# Values below 80% indicate image quality issues
```

3. **Betting Slip Format Compatibility**:
   - Use standard bookmaker formats (Bet365, William Hill, etc.)
   - Ensure betting slips are recent (older formats may not parse correctly)
   - Avoid handwritten or non-standard betting slips

## API Integration Issues

### Issue: "No results found" for all matches

**Symptoms**: Bot finds betting selections but can't locate match results

**Diagnostic Steps**:
```bash
# Check API status via bot stats
# Look for API call statistics and error rates

# Test API connectivity
curl -X GET "https://v3.football.api-sports.io/status" \
  -H "X-RapidAPI-Key: YOUR_API_KEY"
```

**Common Causes**:

1. **Expired or Invalid API Keys**:
```bash
# Verify Football API key
grep FOOTBALL_API_KEY .env
# Check key status at api-football.com dashboard

# Test Brave API key
curl -X GET "https://api.search.brave.com/res/v1/web/search?q=test" \
  -H "X-Subscription-Token: YOUR_BRAVE_KEY"
```

2. **Rate Limiting**:
```bash
# Check rate limit status in logs
grep "rate limit" logs/*.log

# Adjust rate limiting settings
RATE_LIMIT_WINDOW_MS=120000  # Increase window
RATE_LIMIT_MAX_REQUESTS=25   # Reduce requests
```

3. **API Source Failures**:
```bash
# Monitor API fallback behavior in logs
grep "API.*failed" logs/*.log
grep "Trying.*API" logs/*.log

# Should show progression: Football API → Goal.com → TheSportsDB → Brave Search
```

---

### Issue: Slow API responses

**Symptoms**: Long delays before receiving match results

**Optimization Steps**:

1. **Increase Timeout Settings**:
```bash
# In .env file
REQUEST_TIMEOUT=20000  # Increase from default 10s
OCR_TIMEOUT=45000      # Allow more time for OCR
```

2. **Optimize Caching**:
```bash
# Increase cache TTL and size
CACHE_TTL_MINUTES=180
CACHE_MAX_ENTRIES=2000

# Monitor cache performance via /stats command
# Look for cache hit rate >70%
```

3. **Reduce Concurrent Processing**:
```bash
# Lower concurrent processing to reduce load
CONCURRENT_PROCESSING=1
OCR_WORKER_POOL_SIZE=2
```

## Performance Issues

### Issue: Bot becomes unresponsive

**Symptoms**: Bot doesn't respond to messages or commands

**Immediate Actions**:
```bash
# Check bot process status
pm2 status

# Restart if necessary
pm2 restart telegram-bot-superclaude

# Check system resources
top -p $(pgrep -f "telegram-bot")
```

**Root Cause Analysis**:
```bash
# Check memory usage
pm2 show telegram-bot-superclaude | grep memory

# Review error logs
tail -100 logs/error.log

# Monitor event loop lag
# High lag (>100ms) indicates performance issues
```

**Performance Optimization**:
```bash
# Reduce resource usage
OCR_WORKER_POOL_SIZE=2       # Fewer OCR workers
CACHE_MAX_ENTRIES=1000       # Smaller cache
CONCURRENT_PROCESSING=1       # Single request processing
```

---

### Issue: High error rates

**Symptoms**: Many failed operations, users reporting issues

**Error Analysis**:
```bash
# Review error statistics
grep "ERROR" logs/*.log | head -20

# Check error distribution
grep -c "OCR.*failed" logs/*.log
grep -c "API.*error" logs/*.log
grep -c "Validation.*failed" logs/*.log
```

**Common Error Patterns**:

1. **Network Errors**:
```bash
# Symptoms: "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"
# Solutions: Check internet connectivity, DNS resolution, firewall settings
```

2. **Memory Errors**:
```bash
# Symptoms: "out of memory", "heap limit"
# Solutions: Reduce worker pool size, increase Node.js heap size
```

3. **API Errors**:
```bash
# Symptoms: "401 Unauthorized", "429 Too Many Requests", "500 Internal Server Error"
# Solutions: Verify API keys, implement backoff strategies, check API status
```

## User Experience Issues

### Issue: Users receive confusing error messages

**Symptoms**: User reports of unclear bot responses

**Error Message Improvements**:

1. **Review User-Facing Messages**:
```bash
# Search for user error messages in code
grep -r "await this.sendMessage" src/

# Check validation error formatting
grep -r "formatValidationErrors" src/
```

2. **Implement Better Error Handling**:
```javascript
// Example: Convert technical errors to user-friendly messages
catch (error) {
  if (error.code === 'ENOTFOUND') {
    await this.sendMessage(chatId, '🔄 Network issue. Please try again in a moment.');
  } else if (error.message.includes('timeout')) {
    await this.sendMessage(chatId, '⏱️ Processing took too long. Please try with a clearer image.');
  }
}
```

---

### Issue: Incorrect match results

**Symptoms**: Bot shows wrong scores or match outcomes

**Debugging Process**:

1. **Verify Team Name Matching**:
```bash
# Check team name normalization in logs
grep "Matched.*to.*" logs/*.log

# Common issues: "Man City" vs "Manchester City", "Spurs" vs "Tottenham"
```

2. **Validate API Data Quality**:
```bash
# Check data source reliability in logs
grep "confidence.*very_high" logs/*.log
grep "source.*Football API" logs/*.log

# Lower confidence scores indicate data quality issues
```

3. **Review Date Matching**:
```bash
# Verify match date extraction
grep "Match date:" logs/*.log

# Date format issues can cause wrong match selection
```

## Security and Rate Limiting

### Issue: Rate limiting activation

**Symptoms**: Users receive "rate limit exceeded" messages

**Analysis and Resolution**:
```bash
# Check current rate limit settings
grep RATE_LIMIT .env

# Monitor rate limiting in logs
grep "rate limit" logs/*.log

# Adjust limits based on usage patterns
RATE_LIMIT_WINDOW_MS=60000   # 1 minute window
RATE_LIMIT_MAX_REQUESTS=50   # Requests per window
```

---

### Issue: Potential security concerns

**Symptoms**: Unusual request patterns, suspicious errors

**Security Checklist**:
```bash
# Review error logs for attack patterns
grep -i "injection\|script\|eval" logs/*.log

# Check for excessive failed requests
grep -c "validation.*failed" logs/*.log

# Monitor resource usage spikes
pm2 monit  # Watch for unusual CPU/memory usage
```

## Maintenance Procedures

### Regular Health Checks

**Daily Monitoring**:
```bash
#!/bin/bash
# Health check script

# Check bot status
pm2 list | grep telegram-bot

# Check disk space
df -h | grep "/$"

# Check memory usage
pm2 show telegram-bot-superclaude | grep memory

# Check error rate (should be <5%)
error_count=$(grep -c ERROR logs/combined.log)
total_requests=$(grep -c "Processing image" logs/combined.log)
error_rate=$(echo "scale=2; $error_count / $total_requests * 100" | bc)
echo "Error rate: $error_rate%"
```

**Weekly Maintenance**:
```bash
# Rotate logs
pm2 flush telegram-bot-superclaude

# Clear cache if needed
# (cache automatically manages size, but manual clear if issues)

# Update dependencies (in maintenance window)
npm audit
npm update

# Restart to clear any memory leaks
pm2 restart telegram-bot-superclaude
```

### Emergency Recovery Procedures

**Complete System Recovery**:
```bash
# 1. Stop all services
pm2 stop all

# 2. Backup current state
tar -czf backup-$(date +%Y%m%d).tar.gz .env logs/

# 3. Reset to known good state
git reset --hard HEAD
npm ci

# 4. Restore environment
cp backup/.env .

# 5. Start services
pm2 start ecosystem.config.js

# 6. Verify functionality
pm2 logs telegram-bot-superclaude --lines 20
```

This troubleshooting guide covers the most common issues and provides systematic approaches to diagnosis and resolution.
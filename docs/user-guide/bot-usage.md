# Bot Usage Guide

## Getting Started

### 1. Finding the Bot

To start using the Telegram OCR Betting Slip Bot:

1. Open Telegram on your device
2. Search for the bot username (provided by your administrator)
3. Start a conversation by clicking **Start** or sending `/start`

### 2. Initial Setup

When you first interact with the bot:

```
/start
```

The bot will respond with a welcome message and available commands:

```
🤖 Welcome to OCR Betting Slip Bot!

📷 Send me a betting slip image and I'll analyze it for you.

What I can do:
• Extract text from betting slip images using OCR
• Parse betting selections and odds
• Fetch match results from multiple sources  
• Calculate win/loss outcomes

Commands:
/start - Show this welcome message
/ping - Test if bot is working
/stats - Show bot statistics
/help - Get help and tips

Just send any betting slip image to get started!
```

## Core Functionality

### Image Analysis Workflow

1. **Send Image**: Upload your betting slip image to the bot
2. **OCR Processing**: Bot extracts text from the image
3. **Analysis**: Parses betting selections, odds, and bet details
4. **Match Results**: Fetches actual match results from sports APIs
5. **Win/Loss Calculation**: Determines bet outcomes
6. **Response**: Provides detailed analysis with results

### Supported Image Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)
- **GIF** (.gif) - static images only
- **BMP** (.bmp)

**Maximum file size**: 10MB

## Bot Commands

### `/start`
Shows the welcome message and available commands.

**Usage**: `/start`

**Example**:
```
User: /start
Bot: 🤖 Welcome to OCR Betting Slip Bot! [welcome message...]
```

### `/ping`
Tests if the bot is working and shows uptime.

**Usage**: `/ping`

**Example**:
```
User: /ping
Bot: 🏓 Pong! Bot is working.
     ⏱️ Uptime: 3600 seconds
```

### `/stats`
Displays detailed bot performance statistics.

**Usage**: `/stats`

**Example Response**:
```
📊 Bot Statistics

Processing:
• Messages processed: 1,247
• Images processed: 892
• Betting slips analyzed: 756
• Errors: 23

OCR Performance:
• Worker pool size: 3
• Available workers: 3
• Tasks processed: 892
• Tasks failed: 15
• Avg processing time: 850ms

Cache Performance:
• Hit rate: 73.2%
• Cache entries: 245/1000
• Total hits: 1,891
• Total misses: 693

Match Results:
• API requests: 2,134
• Cache hit rate: 68.5%
• Avg response time: 1,250ms
```

### `/help`
Provides tips for better OCR results and troubleshooting.

**Usage**: `/help`

**Example Response**:
```
❓ Help & Tips

For best OCR results:
• Use high-quality images (clear and well-lit)
• Ensure text is not blurry or cut off
• Avoid images with excessive shadows or glare
• Portrait orientation works best for betting slips

Supported formats:
• Photos (JPEG, PNG)
• Document images (PNG, JPEG, GIF, BMP, WebP)
• Maximum file size: 10MB

Troubleshooting:
• If OCR fails, try a clearer image
• Results depend on image quality
• Some older betting slips may not be parsed correctly

Privacy:
• Images are processed temporarily and not stored
• No personal data is retained after processing
```

## Image Processing Examples

### Example 1: Successful Betting Slip Analysis

**User Action**: Sends a clear betting slip image

**Bot Processing**:
```
🔄 Processing image with OCR...
⚽ Checking match results...
```

**Bot Response**:
```
🎯 Betting Slip Analysis

🟢 Analysis Quality: high
🔍 OCR Confidence: 94.2%

📋 Bet Reference: ABC123456
📅 Match Date: 2025-09-05
🎲 Bet Type: 3 Fold @ 4.85
💰 Stake: £10.00
💸 To Return: £48.50

📊 Selections (3):
1. ✅ Liverpool @ 1.28 WIN
   📈 Full Time Result - Score: 3-0 (Football API)

2. ❌ Tottenham @ 1.38 LOSS  
   📈 Full Time Result - Score: 1-2 (Football API)

3. ✅ Yes @ 1.53 WIN
   📈 Both Teams To Score

📈 Results Summary: 2W - 1L ❌ LOSING BET
```

### Example 2: Poor Quality Image

**User Action**: Sends a blurry or unclear betting slip image

**Bot Response**:
```
🟠 Low Quality Betting Slip Analysis

⚠️ Issues Found:
• Low OCR confidence (62%)
• Unable to extract all odds clearly
• Some team names may be incorrect

📊 Partial Results: 2 selections found

Selections:
1. Liverpool @ N/A
2. [Unclear text] @ 1.50

💡 Tip: Try a clearer image for better results.
```

### Example 3: Non-Betting Slip Image

**User Action**: Sends a regular photo or document

**Bot Response**:
```
📝 OCR Result:

```
This is some regular text from a document
or image that is not a betting slip.
```

Confidence: 87.3%
```

## Understanding Bot Responses

### Analysis Quality Indicators

- **🟢 High**: >90% confidence, complete data extraction
- **🟡 Medium**: 70-90% confidence, most data extracted
- **🟠 Low**: 50-70% confidence, partial data extraction  
- **🔴 Very Low**: <50% confidence, minimal data extraction

### Result Status Icons

- **✅ WIN**: Bet selection was successful
- **❌ LOSS**: Bet selection was unsuccessful  
- **⏳ PENDING**: Match not yet finished
- **🔍 NO RESULT FOUND**: Match result not available
- **❓ UNKNOWN**: Unable to determine result

### Confidence Levels

- **Very High (95-100%)**: Premium API sources with exact match
- **High (85-95%)**: Reliable sources with good match confidence
- **Medium (70-85%)**: Alternative sources or partial matches
- **Low (<70%)**: Web search results or uncertain matches

## Best Practices for Image Quality

### ✅ Good Image Practices

1. **Lighting**: Well-lit, natural lighting preferred
2. **Focus**: Sharp, clear text without blur
3. **Angle**: Straight-on view, not tilted
4. **Coverage**: Full betting slip visible in frame
5. **Resolution**: High resolution images work better
6. **Background**: Plain background, avoid cluttered surfaces

### ❌ Common Issues to Avoid

1. **Poor Lighting**: Too dark, too bright, or uneven lighting
2. **Motion Blur**: Camera shake or movement during capture
3. **Partial Coverage**: Important text cut off at edges
4. **Reflections**: Glare from plastic-covered betting slips
5. **Low Resolution**: Pixelated or compressed images
6. **Obstructions**: Fingers, shadows, or objects covering text

## Privacy and Security

### Data Handling

- **Temporary Processing**: Images processed in memory only
- **No Storage**: Images are not saved or stored permanently
- **Secure APIs**: All external API calls use encrypted connections
- **No Personal Data**: Bot doesn't retain personal information
- **Session-based**: Each interaction is independent

### Rate Limiting

The bot implements rate limiting to ensure fair usage:
- **Limit**: 30 requests per minute per user
- **Reset**: Limit resets every 60 seconds
- **Notice**: Users are notified if limit is exceeded

```
⚠️ Rate limit exceeded. Please wait before sending another image.
```

## Troubleshooting Common Issues

### Issue: "No text found in this image"

**Possible Causes**:
- Image too blurry or low quality
- Text too small or poorly lit
- Unsupported image format

**Solutions**:
- Take a clearer, higher resolution photo
- Ensure good lighting conditions
- Try a different image format (PNG, JPEG)

### Issue: Incorrect team names or odds extracted

**Possible Causes**:
- Poor OCR quality due to image issues
- Uncommon team names not in database
- Formatting differs from expected patterns

**Solutions**:
- Improve image quality and clarity
- Ensure betting slip is from supported bookmakers
- Check that text is clearly visible and readable

### Issue: "No results found" for match lookups

**Possible Causes**:
- Lower league matches not covered by APIs
- Very recent matches not yet in databases
- Team name variations causing lookup failures

**Solutions**:
- Bot automatically tries multiple data sources
- Lower league results may take longer to appear
- Recent matches might not have results yet

### Issue: Rate limit exceeded

**Possible Causes**:
- Sending too many images in a short time period
- Multiple users sharing the same IP address

**Solutions**:
- Wait 60 seconds before sending another image
- Spread out image analysis requests over time

## Feature Limitations

### Current Limitations

1. **Language Support**: English text only
2. **Bookmaker Support**: Optimized for major UK bookmakers
3. **Market Types**: Focus on popular markets (match result, both teams to score)
4. **League Coverage**: Comprehensive for major leagues, limited for lower divisions
5. **Historical Data**: Results available for recent matches (typically last 6 months)

### Future Enhancements

- Multi-language OCR support
- Additional bookmaker format recognition
- Extended market type support
- Historical data expansion
- Real-time match tracking

This guide covers all aspects of using the Telegram OCR Betting Slip Bot effectively. For additional support or feature requests, contact your bot administrator.
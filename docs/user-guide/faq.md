# Frequently Asked Questions (FAQ)

## General Questions

### What is the Telegram OCR Betting Slip Bot?

The bot is an AI-powered tool that analyzes betting slip images using OCR (Optical Character Recognition) technology. It extracts betting information, fetches match results from multiple sports APIs, and calculates win/loss outcomes for your bets.

### How accurate is the OCR and result analysis?

**OCR Accuracy**: Typically 85-95% for high-quality images from major bookmakers
**Result Accuracy**: 95%+ when using Football API (premium source) for major leagues
**Coverage**: 1,100+ leagues worldwide with multiple data source fallbacks

### Which bookmakers are supported?

The bot is optimized for major UK bookmakers including:
- Bet365, William Hill, Ladbrokes, Paddy Power
- Sky Bet, Coral, Betfred, Unibet
- Most standard betting slip formats

### Is my data safe and private?

**Yes, completely secure**:
- Images are processed in memory only and never stored
- No personal data is retained after analysis
- All API calls use encrypted HTTPS connections
- No betting slip data is saved or logged

## Usage Questions

### What image formats can I send?

**Supported formats**:
- JPEG (.jpg, .jpeg) - Recommended
- PNG (.png) - Highest quality
- WebP, GIF (static), BMP
- Maximum file size: 10MB

### Why is the bot saying "No text found in this image"?

**Common causes**:
1. **Poor image quality**: Blurry, low resolution, or dark images
2. **Unsupported format**: Check file format is supported
3. **Image too small**: Minimum 800x600 pixels recommended
4. **Non-text content**: Image doesn't contain readable text

**Solutions**:
- Take a clearer, higher resolution photo
- Ensure good lighting conditions
- Hold camera steady to avoid motion blur
- Try PNG format for better quality

### The bot extracted wrong team names. Why?

**Common issues**:
1. **Poor image quality**: OCR can't read text clearly
2. **Unusual fonts**: Non-standard betting slip formats
3. **Partial text**: Team names cut off or partially obscured
4. **Abbreviations**: Short team names may be misinterpreted

**Solutions**:
- Use high-quality, well-lit images
- Ensure entire team names are visible
- Use betting slips from major bookmakers
- Check image isn't tilted or distorted

### Why can't the bot find match results for my selections?

**Possible reasons**:
1. **Lower league matches**: May not be covered by major APIs
2. **Very recent matches**: Results might not be available yet
3. **Non-football sports**: Bot is optimized for football/soccer
4. **Team name variations**: Different naming conventions

**The bot tries multiple sources automatically**:
- Football API (premium source)
- Goal.com web scraping
- TheSportsDB database
- Brave Search as fallback

## Technical Questions

### What does the confidence score mean?

**OCR Confidence (0-100%)**:
- 90%+: Excellent text recognition
- 80-90%: Good quality, minor issues possible
- 70-80%: Moderate quality, some errors likely
- <70%: Poor quality, significant errors expected

**Result Confidence**:
- **Very High**: Premium API with exact match
- **High**: Reliable source with good match
- **Medium**: Alternative source or partial match
- **Low**: Web search result or uncertain match

### How long does analysis take?

**Typical processing times**:
- Simple betting slip (1-3 selections): 2-5 seconds
- Complex betting slip (5+ selections): 5-15 seconds
- High resolution images: May take longer
- Poor quality images: Extra processing time

**Factors affecting speed**:
- Image size and quality
- Number of selections on slip
- API response times
- Current system load

### What does "Rate limit exceeded" mean?

You've sent too many images in a short time period.

**Current limits**:
- 30 requests per minute per user
- Limit resets every 60 seconds

**Solution**: Wait 60 seconds before sending another image

## Result Interpretation

### What do the different result icons mean?

- **✅ WIN**: Your selection was correct
- **❌ LOSS**: Your selection was incorrect
- **⏳ PENDING**: Match hasn't finished yet
- **🔍 NO RESULT FOUND**: Match result not available
- **❓ UNKNOWN**: Unable to determine result

### How does the bot determine win/loss for different bet types?

**Full Time Result**:
- Home win: Home team selected and won
- Away win: Away team selected and won
- Draw: Either team selected but match was draw (loss)

**Both Teams To Score**:
- Yes: Both teams scored (win if you selected Yes)
- No: At least one team didn't score (win if you selected No)

**Over/Under Goals**:
- Over 2.5: Total goals > 2.5 (win if you selected Over)
- Under 2.5: Total goals < 2.5 (win if you selected Under)

### What if results show different scores?

The bot uses multiple data sources and shows the source for each result:
- **Football API**: Most reliable, premium source
- **Goal.com**: Generally accurate for major leagues
- **TheSportsDB**: Good for historical data
- **Brave Search**: Backup source, may have variations

If you see conflicting results, Football API results are most trustworthy.

## Troubleshooting

### The bot isn't responding to my messages

**Check the following**:
1. Send `/ping` to test basic connectivity
2. Ensure you're messaging the correct bot
3. Check if bot is temporarily down for maintenance
4. Try restarting your Telegram app

### My betting slip analysis seems incomplete

**Common causes**:
1. **Image quality**: Poor OCR extraction
2. **Unusual format**: Non-standard betting slip layout
3. **Partial image**: Important parts cut off
4. **Complex layout**: Multiple columns or sections

**Solutions**:
- Retake image with better quality
- Ensure entire betting slip is visible
- Use standard bookmaker format
- Try landscape orientation for wide slips

### Results are taking a very long time

**Normal processing time**: 2-15 seconds depending on complexity

**If longer than expected**:
- High system load may cause delays
- Multiple API failures requiring fallbacks
- Very complex betting slips take longer
- Network connectivity issues

**Solution**: Wait a bit longer or try again with a simpler image

### The analysis quality shows as "low" - what can I improve?

**Low quality indicators**:
- OCR confidence below 70%
- Multiple parsing errors
- Missing odds or selections
- Unclear team names

**Improvements**:
1. **Better lighting**: Natural daylight preferred
2. **Higher resolution**: Use maximum camera quality
3. **Stable camera**: Avoid motion blur
4. **Clean surface**: Remove wrinkles and shadows
5. **Standard format**: Use major bookmaker slips

## Advanced Usage

### Can I analyze multiple betting slips at once?

Currently, send one image at a time for best results. The bot processes each image individually to ensure accuracy.

### Does the bot work with accumulator bets?

Yes! The bot handles:
- Single bets
- Double/treble accumulators
- Multiple fold accumulators
- Combination bets

It will analyze each selection individually and provide overall bet outcome.

### Can I get historical analysis of old betting slips?

Yes, as long as:
- Match results are available in the APIs (typically 6+ months)
- Date information is clearly visible on the slip
- Betting slip format is recognizable

### What sports are supported?

**Primary focus**: Football/Soccer (all major leagues worldwide)
**Limited support**: Other sports may work but optimization is for football
**Future expansion**: Additional sports support planned

## Getting Help

### The bot gave me an unexpected result

1. Check the confidence scores in the response
2. Verify image quality meets requirements
3. Compare with known match results
4. Try with a clearer image if confidence is low

### I found a bug or want to suggest a feature

- Contact your bot administrator
- Provide specific details about the issue
- Include the original image if possible (for bug reports)
- Describe expected vs actual behavior

### How can I get the best results?

**Image quality checklist**:
- [ ] High resolution (1920x1080+ preferred)
- [ ] Good lighting, no shadows or glare
- [ ] Sharp focus on all text
- [ ] Entire betting slip visible
- [ ] Standard bookmaker format
- [ ] Flat surface, no wrinkles or folds

**Usage tips**:
- Use Portrait orientation for most betting slips
- Take multiple shots and choose the clearest
- Ensure contrast between text and background
- Avoid reflections on plastic-covered slips

This FAQ covers the most common questions and issues users encounter with the Telegram OCR Betting Slip Bot.
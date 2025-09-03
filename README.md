# Telegram OCR Bot

Automatically extracts text from images sent to your Telegram bot using OCR (Optical Character Recognition).

## Features

- 🖼️ **Automatic OCR**: Extracts text from images using Tesseract.js
- 📱 **Telegram Integration**: Works with any Telegram chat or group
- 📝 **Auto Reply**: Responds with extracted text
- 🔒 **Simple Setup**: Just need a bot token from @BotFather
- 📄 **Multiple Formats**: Supports both photos and image documents

## Quick Setup

### 1. Get Bot Token
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Type `/newbot`
3. Follow the prompts to create your bot
4. Save the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Install and Run
```bash
cd telegram-ocr-bot
npm install
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
npm start
```

### 3. Test the Bot
1. Find your bot on Telegram (search for the username you created)
2. Send `/start` to begin
3. Send any image to extract text from it

## Commands

- `/start` - Show welcome message and instructions
- `/ping` - Test if bot is working
- Send any image - Bot will extract text using OCR

## Usage

1. Start the bot: `npm start`
2. Send images to your bot
3. Bot automatically processes and replies with extracted text
4. Works in private chats and groups (if bot is added)

## Environment Variables

- `TELEGRAM_BOT_TOKEN` - Required. Get from @BotFather

## Match Results Source

The bot uses real-time match data from [Goal.com](https://goal.com) by scraping recent fixtures:
- All major leagues and competitions
- Live scores and completed matches
- Recent match results (last 3 days)
- International and domestic competitions

No API key required - scrapes publicly available data!

## Dependencies

- `node-telegram-bot-api` - Telegram Bot API wrapper
- `tesseract.js` - OCR text recognition

## Notes

- Works with photos sent via camera or gallery
- Also processes image files sent as documents
- Supports multiple languages (currently configured for English)
- No QR codes or complex authentication needed!
- Searches recent fixtures across all competitions on Goal.com
- Handles team name variations (e.g., "Chelsea" vs "Chelsea FC")
- Shows actual scores and win/loss status from live data
- No API keys or registration required
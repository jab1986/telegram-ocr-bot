# Production Deployment Guide

## Pre-Deployment Checklist

### System Requirements

**Minimum System Requirements:**
- **CPU**: 2 cores, 2.4GHz
- **RAM**: 2GB available memory
- **Storage**: 1GB free space
- **Network**: Stable internet connection
- **Node.js**: Version 18.0.0 or higher

**Recommended Production Requirements:**
- **CPU**: 4+ cores, 3.0GHz+
- **RAM**: 4GB+ available memory
- **Storage**: 5GB+ free space (for logs and cache)
- **Network**: High-bandwidth, low-latency connection
- **Node.js**: Latest LTS version

### Required API Keys

1. **Telegram Bot Token** (Required)
   - Obtain from [@BotFather](https://t.me/botfather)
   - Create new bot: `/newbot`
   - Save token securely

2. **Football API Key** (Highly Recommended)
   - Register at [api-football.com](https://www.api-football.com/)
   - Choose appropriate subscription plan
   - Note rate limits for your plan

3. **Brave Search API Key** (Optional)
   - Register at [Brave Search API](https://api.search.brave.com/)
   - Free tier available with limitations

## Deployment Methods

### Method 1: Direct Node.js Deployment

#### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 for process management
sudo npm install -g pm2

# Create application user (security best practice)
sudo useradd -m -s /bin/bash telegram-bot
sudo usermod -aG sudo telegram-bot
```

#### 2. Application Setup

```bash
# Switch to application user
sudo su - telegram-bot

# Clone repository
git clone <your-repository-url> telegram-bot-superclaude
cd telegram-bot-superclaude

# Install dependencies
npm ci --only=production

# Create production environment file
cp .env.example .env

# Edit environment configuration
nano .env
```

#### 3. Environment Configuration

```bash
# Required settings for production
TELEGRAM_BOT_TOKEN=your_actual_telegram_bot_token
NODE_ENV=production

# API Keys (obtain from respective providers)
FOOTBALL_API_KEY=your_football_api_key_here
BRAVE_API_KEY=your_brave_api_key_here

# Performance settings for production
OCR_WORKER_POOL_SIZE=4
CONCURRENT_PROCESSING=3
OCR_TIMEOUT=30000
REQUEST_TIMEOUT=15000

# Caching configuration
CACHE_ENABLED=true
CACHE_TTL_MINUTES=120
CACHE_MAX_ENTRIES=2000

# Rate limiting (adjust based on your API limits)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50

# Logging configuration
LOG_LEVEL=info
ENABLE_CONSOLE_LOGGING=false
ENABLE_FILE_LOGGING=true

# Telegram settings
TELEGRAM_POLLING_INTERVAL=300
TELEGRAM_POLLING_TIMEOUT=60000
```

#### 4. PM2 Configuration

Create PM2 ecosystem file:

```bash
# Create PM2 configuration
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'telegram-bot-superclaude',
    script: 'src/app.js',
    cwd: '/home/telegram-bot/telegram-bot-superclaude',
    user: 'telegram-bot',
    env: {
      NODE_ENV: 'production'
    },
    // Process management
    instances: 1,
    exec_mode: 'fork',
    
    // Resource limits
    max_memory_restart: '1G',
    
    // Restart settings
    autorestart: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Logging
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Monitoring
    monitor: true,
    
    // Environment
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the displayed instructions to run the generated command with sudo
```

#### 5. System Service Setup (Alternative to PM2)

If you prefer systemd over PM2:

```bash
# Create systemd service file
sudo tee /etc/systemd/system/telegram-bot.service > /dev/null << EOF
[Unit]
Description=Telegram OCR Betting Slip Bot
After=network.target

[Service]
Type=simple
User=telegram-bot
WorkingDirectory=/home/telegram-bot/telegram-bot-superclaude
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=telegram-bot

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/telegram-bot/telegram-bot-superclaude/logs

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable telegram-bot.service
sudo systemctl start telegram-bot.service

# Check service status
sudo systemctl status telegram-bot.service
```

### Method 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Production Dockerfile
FROM node:18-alpine

# Install system dependencies for Tesseract
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (if needed for health checks)
EXPOSE 3000

# Start application
CMD ["node", "src/app.js"]
```

#### 2. Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  telegram-bot:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - FOOTBALL_API_KEY=${FOOTBALL_API_KEY}
      - BRAVE_API_KEY=${BRAVE_API_KEY}
      - OCR_WORKER_POOL_SIZE=4
      - CACHE_ENABLED=true
      - LOG_LEVEL=info
      - ENABLE_FILE_LOGGING=true
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - bot-network
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  bot-network:
    driver: bridge
```

#### 3. Deploy with Docker

```bash
# Create environment file
cp .env.example .env
# Edit .env with your production values

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Health check
docker-compose -f docker-compose.prod.yml ps
```

### Method 3: Cloud Platform Deployment

#### Heroku Deployment

```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Add buildpack for Tesseract
heroku buildpacks:add https://github.com/pathwaysmedical/heroku-buildpack-tesseract

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set TELEGRAM_BOT_TOKEN=your_token_here
heroku config:set FOOTBALL_API_KEY=your_api_key_here

# Deploy
git push heroku main

# Scale dynos
heroku ps:scale web=1

# View logs
heroku logs --tail
```

#### DigitalOcean App Platform

```yaml
# app.yaml
name: telegram-bot-superclaude
services:
- name: bot
  source_dir: /
  github:
    repo: your-username/telegram-bot-superclaude
    branch: main
  run_command: node src/app.js
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: TELEGRAM_BOT_TOKEN
    value: your_token_here
    type: SECRET
  - key: FOOTBALL_API_KEY  
    value: your_api_key_here
    type: SECRET
```

## Post-Deployment Configuration

### 1. Verify Deployment

```bash
# Check process status
pm2 status

# Monitor logs
pm2 logs telegram-bot-superclaude --lines 50

# Test bot functionality
# Send /ping to your bot via Telegram

# Check system resources
pm2 monit
```

### 2. Monitoring Setup

#### Log Rotation Configuration

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/telegram-bot > /dev/null << EOF
/home/telegram-bot/telegram-bot-superclaude/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    copytruncate
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

#### Basic Monitoring Script

```bash
# Create monitoring script
cat > monitor.sh << EOF
#!/bin/bash
# Basic health monitoring for Telegram Bot

BOT_NAME="telegram-bot-superclaude"
LOG_FILE="/home/telegram-bot/bot-monitor.log"

# Check if bot is running
if pm2 list | grep -q "\$BOT_NAME.*online"; then
    echo "\$(date): Bot is running" >> \$LOG_FILE
else
    echo "\$(date): Bot is down! Restarting..." >> \$LOG_FILE
    pm2 restart \$BOT_NAME
fi

# Check memory usage
MEMORY_USAGE=\$(pm2 show \$BOT_NAME | grep "memory usage" | awk '{print \$4}')
if [[ \${MEMORY_USAGE%M*} -gt 800 ]]; then
    echo "\$(date): High memory usage: \$MEMORY_USAGE" >> \$LOG_FILE
fi
EOF

chmod +x monitor.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add line: */5 * * * * /home/telegram-bot/telegram-bot-superclaude/monitor.sh
```

### 3. Security Hardening

#### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port as needed)
sudo ufw allow 22/tcp

# Allow HTTPS outbound (for API calls)
sudo ufw allow out 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### SSL/TLS Configuration (if using webhooks)

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot

# Get SSL certificate (if using domain)
sudo certbot certonly --standalone -d your-domain.com

# Configure nginx reverse proxy (optional)
sudo apt install nginx

# Basic nginx configuration for webhook endpoint
sudo tee /etc/nginx/sites-available/telegram-bot << EOF
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location /webhook {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Backup and Recovery

### 1. Automated Backups

```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/telegram-bot/backups"
APP_DIR="/home/telegram-bot/telegram-bot-superclaude"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup configuration and logs
tar -czf "\$BACKUP_DIR/bot_backup_\$DATE.tar.gz" \\
    -C \$APP_DIR \\
    .env \\
    logs/ \\
    ecosystem.config.js \\
    package*.json

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "bot_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: bot_backup_\$DATE.tar.gz"
EOF

chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/telegram-bot/telegram-bot-superclaude/backup.sh
```

### 2. Recovery Procedures

```bash
# Stop bot
pm2 stop telegram-bot-superclaude

# Restore from backup
cd /home/telegram-bot
tar -xzf backups/bot_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart bot
pm2 start telegram-bot-superclaude

# Verify functionality
pm2 logs telegram-bot-superclaude --lines 20
```

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Daily**:
   - Check bot status and logs
   - Monitor system resources
   - Verify API connectivity

2. **Weekly**:
   - Review error logs
   - Check disk space
   - Update dependencies if needed

3. **Monthly**:
   - Security updates
   - Performance analysis
   - Backup verification

### Update Procedures

```bash
# Create maintenance window
pm2 stop telegram-bot-superclaude

# Backup current version
./backup.sh

# Pull updates
git pull origin main

# Update dependencies
npm ci --only=production

# Test configuration
npm run test

# Restart bot
pm2 start telegram-bot-superclaude

# Monitor for issues
pm2 logs telegram-bot-superclaude --lines 50
```

This deployment guide provides comprehensive instructions for production deployment with proper security, monitoring, and maintenance procedures.
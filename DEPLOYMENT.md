# Deployment Guide

This guide covers deploying the comment system to production environments.

## Pre-Deployment Checklist

### Security
- [ ] Strong session secret (32+ characters)
- [ ] HTTPS certificate configured
- [ ] Database credentials secured
- [ ] CORS origins restricted to your domains
- [ ] Rate limiting configured appropriately
- [ ] Security headers enabled
- [ ] Google OAuth redirect URIs updated for production

### Database
- [ ] Production database created
- [ ] Database user with minimal permissions
- [ ] Connection pooling configured
- [ ] Backup strategy implemented
- [ ] SSL connections enabled (if required)

### Environment
- [ ] NODE_ENV=production
- [ ] All environment variables configured
- [ ] Log rotation configured
- [ ] Monitoring setup
- [ ] Error tracking enabled

## Deployment Options

### Option 1: Traditional VPS/Server

#### 1. Server Setup

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2
\`\`\`

#### 2. Application Deployment

\`\`\`bash
# Clone repository
git clone https://github.com/yourusername/disqus-alternative.git
cd disqus-alternative

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.example .env
nano .env  # Configure production settings

# Setup database
npm run setup

# Start with PM2
pm2 start server.js --name "comment-system"
pm2 startup
pm2 save
\`\`\`

#### 3. Nginx Configuration

Create `/etc/nginx/sites-available/comment-system`:

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

Enable the site:
\`\`\`bash
sudo ln -s /etc/nginx/sites-available/comment-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### Option 2: Docker Deployment

#### 1. Create Dockerfile

\`\`\`dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "server.js"]
\`\`\`

#### 2. Create docker-compose.yml

\`\`\`yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=comment_user
      - DB_PASSWORD=secure_password
      - DB_NAME=comment_system
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=comment_system
      - MYSQL_USER=comment_user
      - MYSQL_PASSWORD=secure_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts:/docker-entrypoint-initdb.d
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mysql_data:
\`\`\`

#### 3. Deploy with Docker

\`\`\`bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale if needed
docker-compose up -d --scale app=3
\`\`\`

### Option 3: Cloud Platforms

#### Heroku

1. **Prepare for Heroku**

Create `Procfile`:
\`\`\`
web: node server.js
\`\`\`

2. **Deploy**

\`\`\`bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Add MySQL addon
heroku addons:create cleardb:ignite

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret
heroku config:set GOOGLE_CLIENT_ID=your-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-client-secret

# Deploy
git push heroku main

# Setup database
heroku run npm run setup
\`\`\`

#### DigitalOcean App Platform

Create `app.yaml`:

\`\`\`yaml
name: comment-system
services:
- name: api
  source_dir: /
  github:
    repo: yourusername/disqus-alternative
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: SESSION_SECRET
    value: your-secret
    type: SECRET
databases:
- name: comments-db
  engine: MYSQL
  version: "8"
\`\`\`

## Environment Configuration

### Production .env

\`\`\`env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=your-db-host
DB_USER=comment_user
DB_PASSWORD=secure_password
DB_NAME=comment_system

# Security
SESSION_SECRET=your-very-secure-session-secret-32-chars-minimum
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# Google OAuth
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_SECURITY_LOGGING=true
LOG_LEVEL=info
\`\`\`

## SSL/TLS Setup

### Let's Encrypt (Free)

\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
\`\`\`

### Custom Certificate

\`\`\`bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate signing request
openssl req -new -key private.key -out certificate.csr

# Install certificate files
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/private.key
\`\`\`

## Database Optimization

### MySQL Configuration

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

\`\`\`ini
[mysqld]
# Connection settings
max_connections = 200
connect_timeout = 10
wait_timeout = 600
max_allowed_packet = 64M

# Buffer settings
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT

# Query cache
query_cache_type = 1
query_cache_size = 32M
query_cache_limit = 2M

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
\`\`\`

### Database Indexes

Ensure these indexes exist:

\`\`\`sql
-- Comments table indexes
CREATE INDEX idx_content_id ON comments(content_id);
CREATE INDEX idx_parent_id ON comments(parent_id);
CREATE INDEX idx_user_id ON comments(user_id);
CREATE INDEX idx_status ON comments(status);
CREATE INDEX idx_created_at ON comments(created_at);

-- Users table indexes
CREATE INDEX idx_google_id ON users(google_id);
CREATE INDEX idx_email ON users(email);
\`\`\`

## Monitoring and Logging

### PM2 Monitoring

\`\`\`bash
# Monitor processes
pm2 monit

# View logs
pm2 logs comment-system

# Restart app
pm2 restart comment-system

# Reload with zero downtime
pm2 reload comment-system
\`\`\`

### Log Rotation

Create `/etc/logrotate.d/comment-system`:

\`\`\`
/path/to/app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
\`\`\`

### Health Checks

Create `healthcheck.js`:

\`\`\`javascript
const http = require('http')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 3000
}

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0)
  } else {
    process.exit(1)
  }
})

req.on('error', () => {
  process.exit(1)
})

req.on('timeout', () => {
  req.destroy()
  process.exit(1)
})

req.end()
\`\`\`

## Backup Strategy

### Database Backups

\`\`\`bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mysql"
DB_NAME="comment_system"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u backup_user -p$BACKUP_PASSWORD $DB_NAME > $BACKUP_DIR/comments_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/comments_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "comments_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/comments_$DATE.sql.gz s3://your-backup-bucket/
\`\`\`

Add to crontab:
\`\`\`bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
\`\`\`

## Performance Optimization

### Node.js Optimization

\`\`\`javascript
// Add to server.js
if (process.env.NODE_ENV === 'production') {
  // Enable compression
  const compression = require('compression')
  app.use(compression())
  
  // Set proper cache headers
  app.use(express.static('public', {
    maxAge: '1y',
    etag: false
  }))
}
\`\`\`

### Nginx Caching

\`\`\`nginx
# Add to nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
    gzip_static on;
}

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
\`\`\`

## Security Hardening

### Firewall Configuration

\`\`\`bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# iptables alternative
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
\`\`\`

### Fail2Ban Setup

\`\`\`bash
# Install fail2ban
sudo apt install fail2ban

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
\`\`\`

\`\`\`ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
\`\`\`

## Troubleshooting

### Common Issues

**High Memory Usage**
- Check for memory leaks with `pm2 monit`
- Increase swap space if needed
- Optimize database queries

**Database Connection Errors**
- Check connection pool settings
- Verify database server status
- Review connection limits

**SSL Certificate Issues**
- Verify certificate chain
- Check certificate expiration
- Ensure proper file permissions

### Performance Issues

**Slow Response Times**
- Enable query logging
- Add database indexes
- Implement caching
- Use CDN for static assets

**High CPU Usage**
- Profile application with `clinic.js`
- Optimize database queries
- Consider horizontal scaling

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review security logs weekly
- [ ] Monitor disk space daily
- [ ] Test backups monthly
- [ ] Update SSL certificates before expiry
- [ ] Review and rotate logs

### Update Process

\`\`\`bash
# Backup before update
pm2 stop comment-system
cp -r /path/to/app /path/to/app.backup

# Update code
git pull origin main
npm ci --only=production

# Run migrations if any
npm run migrate

# Restart application
pm2 start comment-system
\`\`\`

This deployment guide covers the most common scenarios. For specific cloud providers or custom setups, refer to their documentation and adapt these instructions accordingly.

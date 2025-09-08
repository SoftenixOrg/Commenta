# Installation Guide

This guide will walk you through setting up the comment system step by step.

## System Requirements

- **Node.js**: Version 16.0 or higher
- **MySQL**: Version 5.7 or higher (or MySQL 8.0)
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 512MB RAM
- **Storage**: At least 1GB free space

## Step 1: Download and Setup

### Option A: Clone from Git

\`\`\`bash
git clone https://github.com/yourusername/disqus-alternative.git
cd disqus-alternative
\`\`\`

### Option B: Download ZIP

1. Download the ZIP file from GitHub
2. Extract to your desired directory
3. Navigate to the directory in terminal

## Step 2: Install Dependencies

\`\`\`bash
npm install
\`\`\`

This will install all required packages including:
- Express.js for the web server
- MySQL2 for database connectivity
- Passport for authentication
- Security middleware packages

## Step 3: Database Setup

### Create MySQL Database

\`\`\`sql
CREATE DATABASE comment_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

### Create Database User (Recommended)

\`\`\`sql
CREATE USER 'comment_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON comment_system.* TO 'comment_user'@'localhost';
FLUSH PRIVILEGES;
\`\`\`

## Step 4: Environment Configuration

### Copy Environment Template

\`\`\`bash
cp .env.example .env
\`\`\`

### Edit Configuration

Open `.env` file and configure:

\`\`\`env
# Database Configuration
DB_HOST=localhost
DB_USER=comment_user
DB_PASSWORD=secure_password
DB_NAME=comment_system

# Google OAuth (see Step 5)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Security
SESSION_SECRET=generate_a_very_long_random_string_here
ALLOWED_ORIGINS=http://localhost:3000

# Server
PORT=3000
NODE_ENV=development
\`\`\`

### Generate Session Secret

Use a strong random string (32+ characters):

\`\`\`bash
# On Linux/Mac
openssl rand -base64 32

# Or use online generator
# https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
\`\`\`

## Step 5: Google OAuth Setup

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select existing project
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

### Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Comment System
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (development)
     - `https://yourdomain.com/auth/google/callback` (production)

5. Copy Client ID and Client Secret to your `.env` file

## Step 6: Initialize Database

Run the setup script to create tables:

\`\`\`bash
npm run setup
\`\`\`

This will:
- Create the `users` table
- Create the `comments` table
- Set up proper indexes and foreign keys

## Step 7: Start the Server

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

### Production Mode

\`\`\`bash
npm start
\`\`\`

## Step 8: Test Installation

1. Open your browser
2. Go to `http://localhost:3000`
3. You should see: `{"status":"success","message":"Comment System API is running"}`
4. Test the demo at `http://localhost:3000/demo.html`

## Step 9: Integration

### Basic HTML Integration

Add to your website:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>My Article</h1>
    <p>Article content here...</p>
    
    <!-- Comments Widget -->
    <div id="comments"></div>
    
    <link rel="stylesheet" href="http://localhost:3000/widget.css">
    <script src="http://localhost:3000/widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            new CommentsWidget({
                containerId: 'comments',
                contentId: 'my-article-1',
                apiBase: 'http://localhost:3000'
            })
        })
    </script>
</body>
</html>
\`\`\`

## Troubleshooting Installation

### Database Connection Issues

**Error**: `ER_ACCESS_DENIED_ERROR`
- Check username and password in `.env`
- Verify user has correct permissions

**Error**: `ECONNREFUSED`
- Ensure MySQL server is running
- Check host and port configuration

### Google OAuth Issues

**Error**: `redirect_uri_mismatch`
- Verify redirect URIs in Google Console match exactly
- Check for trailing slashes

**Error**: `invalid_client`
- Verify Client ID and Secret are correct
- Check for extra spaces in `.env` file

### Port Already in Use

**Error**: `EADDRINUSE`
\`\`\`bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
\`\`\`

### Permission Issues

**Error**: `EACCES`
\`\`\`bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm

# Or use different directory
mkdir ~/comment-system
cd ~/comment-system
\`\`\`

## Production Deployment

### Environment Setup

\`\`\`env
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
DB_HOST=your-production-db-host
ALLOWED_ORIGINS=https://yourdomain.com
\`\`\`

### Process Management

Use PM2 for production:

\`\`\`bash
npm install -g pm2
pm2 start server.js --name "comment-system"
pm2 startup
pm2 save
\`\`\`

### Reverse Proxy

Configure Nginx or Apache to proxy requests to your Node.js server.

## Security Checklist

- [ ] Strong session secret (32+ characters)
- [ ] Database user with minimal permissions
- [ ] HTTPS enabled in production
- [ ] CORS origins restricted to your domains
- [ ] Regular security updates
- [ ] Database backups configured
- [ ] Security logs monitored

## Next Steps

1. Customize the widget styling
2. Configure additional security settings
3. Set up monitoring and logging
4. Plan backup strategy
5. Test with real traffic

For more advanced configuration, see the main [README.md](README.md) file.

# Open Source Comment System

A modern, secure, and feature-rich comment system built as an open-source alternative to Disqus. Built with Node.js, Express, MySQL, and vanilla JavaScript.

## Features

### 🔐 Authentication & Security
- Google OAuth 2.0 integration
- CSRF protection
- XSS protection with content sanitization
- Rate limiting (5 comments/minute per IP)
- Anti-spam detection
- Security event logging
- IP filtering capabilities

### 💬 Comment System
- Nested replies support
- Real-time comment posting
- Edit and delete comments
- Like/upvote functionality
- Pagination for large comment threads
- Soft delete with status management

### 🎨 Frontend Widget
- Vanilla JavaScript (no dependencies)
- Light/dark theme toggle
- Responsive design
- Easy integration with any website
- Customizable styling
- Mobile-friendly interface

### 🛡️ Anti-Spam Protection
- Time-based rate limiting (max 2 comments per 10 seconds per user)
- Duplicate content detection
- Spam pattern recognition
- Content length validation

## Quick Start

### Prerequisites
- Node.js 16+ 
- MySQL 5.7+ or 8.0+
- Google OAuth credentials

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/disqus-alternative.git
   cd disqus-alternative
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup environment variables**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

4. **Setup database**
   \`\`\`bash
   npm run setup
   \`\`\`

5. **Start the server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Visit the demo**
   Open `http://localhost:3000/demo.html` in your browser

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

\`\`\`env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=comment_system

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security Configuration
SESSION_SECRET=your_very_secure_session_secret_at_least_32_characters_long
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Server Configuration
PORT=3000
NODE_ENV=development
\`\`\`

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)

## Integration

### Basic Integration

Add this to your HTML page:

\`\`\`html
<!-- Comments Widget Container -->
<div id="comments"></div>

<!-- Load Widget -->
<link rel="stylesheet" href="https://your-domain.com/widget.css">
<script src="https://your-domain.com/widget.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  new CommentsWidget({
    containerId: 'comments',
    contentId: 'unique-page-identifier',
    apiBase: 'https://your-api-domain.com',
    theme: 'light' // or 'dark'
  })
})
</script>
\`\`\`

### Advanced Integration

For multiple comment sections or custom configuration:

\`\`\`javascript
// Initialize multiple widgets
const widgets = [
  {
    containerId: 'article-comments',
    contentId: 'article-123',
    theme: 'light'
  },
  {
    containerId: 'review-comments', 
    contentId: 'review-456',
    theme: 'dark'
  }
]

widgets.forEach(config => {
  new CommentsWidget(config)
})
\`\`\`

### Embed Script

For easier integration, use the embed script:

\`\`\`html
<div data-comments="unique-page-id" data-theme="light"></div>
<script src="https://your-domain.com/widget-embed.js"></script>
\`\`\`

## API Documentation

### Authentication Endpoints

#### `GET /auth/google`
Initiate Google OAuth login

#### `GET /auth/google/callback`
Google OAuth callback handler

#### `POST /auth/logout`
Logout current user

#### `GET /auth/status`
Check authentication status

**Response:**
\`\`\`json
{
  "status": "success",
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "John Doe",
    "email": "john@example.com",
    "avatar_url": "https://..."
  }
}
\`\`\`

### Comment Endpoints

#### `POST /api/comments`
Create a new comment

**Headers:**
- `Content-Type: application/json`

**Body:**
\`\`\`json
{
  "content_id": "page-identifier",
  "parent_id": null,
  "content": "Comment text"
}
\`\`\`

**Response:**
\`\`\`json
{
  "status": "success",
  "message": "Comment created successfully",
  "data": {
    "id": 1,
    "content": "Comment text",
    "username": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00.000Z",
    "likes": 0
  }
}
\`\`\`

#### `GET /api/comments?content_id=page-id&page=1&limit=20`
Get comments for a page

**Query Parameters:**
- `content_id` (required): Page identifier
- `page` (optional): Page number (default: 1)
- `limit` (optional): Comments per page (default: 20, max: 50)

#### `PUT /api/comments/:id`
Update a comment (owner only)

#### `DELETE /api/comments/:id`
Delete a comment (owner only)

#### `POST /api/comments/:id/like`
Like a comment

## Deployment

### Production Setup

1. **Environment Configuration**
   \`\`\`bash
   NODE_ENV=production
   COOKIE_SECURE=true
   COOKIE_SAME_SITE=strict
   \`\`\`

2. **Database Setup**
   - Use connection pooling
   - Enable SSL connections
   - Regular backups

3. **Security Checklist**
   - [ ] HTTPS enabled
   - [ ] Secure session secrets
   - [ ] Rate limiting configured
   - [ ] CORS origins restricted
   - [ ] Security headers enabled
   - [ ] Database credentials secured

### Docker Deployment

\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
\`\`\`

### Nginx Configuration

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    
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
    }
}
\`\`\`

## Customization

### Styling

The widget uses CSS custom properties for easy theming:

\`\`\`css
.comments-widget {
  --bg-primary: #ffffff;
  --text-primary: #212529;
  --accent-color: #007bff;
  /* ... other variables */
}
\`\`\`

### Custom Themes

Create custom themes by overriding CSS variables:

\`\`\`css
.comments-widget.custom-theme {
  --bg-primary: #f8f9fa;
  --accent-color: #28a745;
  --border-color: #dee2e6;
}
\`\`\`

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check MySQL server is running
- Verify credentials in `.env`
- Ensure database exists

**Google OAuth Not Working**
- Verify client ID and secret
- Check redirect URIs in Google Console
- Ensure domains match exactly

**CORS Errors**
- Add your domain to `ALLOWED_ORIGINS`
- Check protocol (http vs https)

**Rate Limiting Issues**
- Check IP address configuration
- Verify rate limit settings
- Review security logs

### Debug Mode

Enable debug logging:

\`\`\`bash
NODE_ENV=development
LOG_LEVEL=debug
\`\`\`

### Security Logs

Check security events:

\`\`\`bash
tail -f logs/security.log
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup

\`\`\`bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Check code style
npm run lint
\`\`\`

## License

MIT License - see [LICENSE](LICENSE) file for details.

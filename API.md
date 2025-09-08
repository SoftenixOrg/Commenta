# API Documentation

Complete API reference for the Comment System.

## Base URL

\`\`\`
http://localhost:3000  # Development
https://your-domain.com  # Production
\`\`\`

## Authentication

The API uses session-based authentication with Google OAuth 2.0.

### Authentication Flow

1. Redirect user to `/auth/google`
2. User completes Google OAuth
3. User is redirected back with session cookie
4. Include session cookie in subsequent requests

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Comment Creation | 5 requests | 1 minute |
| Authentication | 10 requests | 15 minutes |
| Like Actions | 20 requests | 1 minute |

## Response Format

All API responses follow this format:

\`\`\`json
{
  "status": "success|error",
  "message": "Human readable message",
  "data": {} // Only present on success
}
\`\`\`

## Authentication Endpoints

### Initiate Google Login

\`\`\`http
GET /auth/google
\`\`\`

Redirects user to Google OAuth consent screen.

**Response**: HTTP 302 redirect to Google

---

### Google OAuth Callback

\`\`\`http
GET /auth/google/callback
\`\`\`

Handles Google OAuth callback. Not called directly.

**Response**: HTTP 302 redirect to origin or home page

---

### Check Authentication Status

\`\`\`http
GET /auth/status
\`\`\`

Returns current user authentication status.

**Response**:
\`\`\`json
{
  "status": "success",
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "John Doe",
    "email": "john@example.com",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  }
}
\`\`\`

---

### Logout

\`\`\`http
POST /auth/logout
\`\`\`

Logs out current user and destroys session.

**Response**:
\`\`\`json
{
  "status": "success",
  "message": "Logged out successfully"
}
\`\`\`

## Comment Endpoints

### Create Comment

\`\`\`http
POST /api/comments
\`\`\`

Creates a new comment. Requires authentication.

**Headers**:
\`\`\`
Content-Type: application/json
Cookie: sessionId=...
\`\`\`

**Body**:
\`\`\`json
{
  "content_id": "page-identifier",
  "parent_id": null,
  "content": "This is my comment"
}
\`\`\`

**Parameters**:
- `content_id` (string, required): Unique identifier for the page/post
- `parent_id` (integer, optional): ID of parent comment for replies
- `content` (string, required): Comment text (1-2000 characters)

**Response**:
\`\`\`json
{
  "status": "success",
  "message": "Comment created successfully",
  "data": {
    "id": 123,
    "content_id": "page-identifier",
    "parent_id": null,
    "user_id": 1,
    "content": "This is my comment",
    "likes": 0,
    "status": "visible",
    "created_at": "2024-01-01T12:00:00.000Z",
    "updated_at": null,
    "username": "John Doe",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  }
}
\`\`\`

**Error Responses**:
- `400`: Invalid input, spam detected, or rate limit exceeded
- `401`: Authentication required

---

### Get Comments

\`\`\`http
GET /api/comments?content_id=page-id&page=1&limit=20
\`\`\`

Retrieves comments for a specific page/post.

**Query Parameters**:
- `content_id` (string, required): Page identifier
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Comments per page (default: 20, max: 50)

**Response**:
\`\`\`json
{
  "status": "success",
  "data": {
    "comments": [
      {
        "id": 123,
        "content_id": "page-identifier",
        "parent_id": null,
        "user_id": 1,
        "content": "This is a comment",
        "likes": 5,
        "status": "visible",
        "created_at": "2024-01-01T12:00:00.000Z",
        "updated_at": null,
        "username": "John Doe",
        "avatar_url": "https://lh3.googleusercontent.com/...",
        "reply_count": 2,
        "replies": [
          {
            "id": 124,
            "content_id": "page-identifier",
            "parent_id": 123,
            "user_id": 2,
            "content": "This is a reply",
            "likes": 1,
            "status": "visible",
            "created_at": "2024-01-01T12:05:00.000Z",
            "updated_at": null,
            "username": "Jane Smith",
            "avatar_url": "https://lh3.googleusercontent.com/..."
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
\`\`\`

---

### Update Comment

\`\`\`http
PUT /api/comments/:id
\`\`\`

Updates an existing comment. Only the comment owner can update.

**Headers**:
\`\`\`
Content-Type: application/json
Cookie: sessionId=...
\`\`\`

**Parameters**:
- `id` (integer): Comment ID

**Body**:
\`\`\`json
{
  "content": "Updated comment text"
}
\`\`\`

**Response**:
\`\`\`json
{
  "status": "success",
  "message": "Comment updated successfully",
  "data": {
    "id": 123,
    "content": "Updated comment text",
    "updated_at": "2024-01-01T12:30:00.000Z",
    // ... other comment fields
  }
}
\`\`\`

**Error Responses**:
- `400`: Invalid input or comment not found
- `401`: Authentication required
- `403`: Not comment owner

---

### Delete Comment

\`\`\`http
DELETE /api/comments/:id
\`\`\`

Soft deletes a comment. Only the comment owner can delete.

**Headers**:
\`\`\`
Cookie: sessionId=...
\`\`\`

**Parameters**:
- `id` (integer): Comment ID

**Response**:
\`\`\`json
{
  "status": "success",
  "message": "Comment deleted successfully"
}
\`\`\`

**Error Responses**:
- `400`: Comment not found
- `401`: Authentication required
- `403`: Not comment owner

---

### Like Comment

\`\`\`http
POST /api/comments/:id/like
\`\`\`

Increments the like count for a comment.

**Parameters**:
- `id` (integer): Comment ID

**Response**:
\`\`\`json
{
  "status": "success",
  "message": "Comment liked successfully",
  "data": {
    "id": 123,
    "likes": 6,
    // ... other comment fields
  }
}
\`\`\`

**Error Responses**:
- `400`: Comment not found
- `429`: Rate limit exceeded

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input or parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 413 | Payload Too Large - Request body too large |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Security Features

### Input Validation

- All inputs are validated and sanitized
- HTML content is cleaned to prevent XSS
- SQL injection protection with parameterized queries

### Anti-Spam Protection

- Time-based rate limiting (max 2 comments per 10 seconds per user)
- Duplicate content detection
- Spam pattern recognition
- Content length validation (1-2000 characters)

### Rate Limiting

Rate limits are applied per IP address or authenticated user:

- Comment creation: 5 per minute
- Like actions: 20 per minute
- General API: 100 per 15 minutes
- Authentication: 10 per 15 minutes

### CSRF Protection

CSRF tokens are required for authentication endpoints but not API endpoints to allow widget integration.

## Content Policies

### Allowed HTML Tags

Comments support limited HTML:
- `<b>`, `<i>`, `<em>`, `<strong>` - Text formatting
- `<a href="...">` - Links (automatically get `rel="nofollow"`)
- `<br>`, `<p>` - Line breaks and paragraphs

### Content Restrictions

- Maximum 2000 characters per comment
- No script tags or dangerous HTML
- Links are automatically marked with `rel="nofollow"`
- Spam patterns are automatically detected and blocked

## Webhook Support (Future)

Planned webhook support for:
- New comment notifications
- Moderation events
- Spam detection alerts

## SDKs and Libraries

### JavaScript Widget

The official JavaScript widget provides easy integration:

\`\`\`javascript
new CommentsWidget({
  containerId: 'comments',
  contentId: 'unique-page-id',
  apiBase: 'https://your-api-domain.com',
  theme: 'light'
})
\`\`\`

### Custom Integration

For custom implementations, ensure:
1. Proper CORS headers
2. Session cookie handling
3. Rate limit compliance
4. Input validation on client side
5. Error handling for all API responses

## Testing

### Test Endpoints

Use these endpoints to test your integration:

\`\`\`bash
# Check API status
curl http://localhost:3000/

# Get comments (no auth required)
curl "http://localhost:3000/api/comments?content_id=test-page"

# Check auth status
curl -b cookies.txt http://localhost:3000/auth/status
\`\`\`

### Rate Limit Testing

To test rate limits, make rapid requests:

\`\`\`bash
# Test comment rate limit
for i in {1..10}; do
  curl -X POST -H "Content-Type: application/json" \
    -d '{"content_id":"test","content":"Test comment"}' \
    -b cookies.txt http://localhost:3000/api/comments
done
\`\`\`

For more examples and integration guides, see the main [README.md](README.md).

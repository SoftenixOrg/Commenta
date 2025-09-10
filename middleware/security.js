const rateLimit = require("express-rate-limit")
const helmet = require("helmet")

// Enhanced rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: "error",
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    // Custom key generator to handle both IP and user-based limiting
    keyGenerator: (req) => {
      return req.user ? `user_${req.user.id}` : req.ip
    },
  })
}

// Different rate limits for different endpoints
const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    "Too many requests from this IP, please try again later.",
  ),

  // Comment creation rate limit (stricter)
  comments: createRateLimit(
    60 * 1000, // 1 minute
    5, // 5 comments per minute
    "Too many comments. Please wait before posting again.",
    true, // Skip successful requests in count
  ),

  // Auth rate limit
  auth: createRateLimit(
    1 * 60 * 1000, // 15 minutes
    6, // 10 auth attempts per 15 minutes
    "Too many authentication attempts, please try again later.",
  ),

  // Like rate limit
  likes: createRateLimit(
    60 * 1000, // 1 minute
    20, // 20 likes per minute
    "Too many like attempts, please slow down.",
  ),
}

// Enhanced helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "*.googleusercontent.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding in iframes
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: "deny" },
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
})

// IP whitelist for development
const ipWhitelist = process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(",") : []

const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress

  // In development, only allow localhost
  if (process.env.NODE_ENV !== "production") {
    const allowedDevIPs = ["127.0.0.1", "::1", "localhost"]
    const isLocalhost = allowedDevIPs.some((ip) => clientIP.includes(ip))

    if (!isLocalhost && !clientIP.startsWith("192.168.") && !clientIP.startsWith("10.")) {
      return res.status(403).json({
        status: "error",
        message: "Development server only accepts local connections",
      })
    }
    return next()
  }

  // Production IP filtering
  if (ipWhitelist.length > 0 && !ipWhitelist.includes(clientIP)) {
    return res.status(403).json({
      status: "error",
      message: "Access denied from this IP address",
    })
  }

  next()
}

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const contentLength = Number.parseInt(req.get("Content-Length") || "0")
  const maxSize = 1024 * 1024 // 1MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      status: "error",
      message: "Request entity too large",
    })
  }

  next()
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader("X-Powered-By")

  // Add custom security headers
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("X-XSS-Protection", "1; mode=block")
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

  // Prevent caching of sensitive endpoints
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.setHeader("Pragma", "no-cache")
    res.setHeader("Expires", "0")
  }

  next()
}

module.exports = {
  rateLimits,
  helmetConfig,
  ipFilter,
  requestSizeLimit,
  securityHeaders,
}

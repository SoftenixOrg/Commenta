const express = require("express")
const session = require("express-session")
const passport = require("passport")
const helmet = require("helmet")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const csrf = require("csurf")
require("dotenv").config()

const { testConnection } = require("./config/database")
const authRoutes = require("./routes/auth")
const commentRoutes = require("./routes/comments")

const { rateLimits, helmetConfig, ipFilter, requestSizeLimit, securityHeaders } = require("./middleware/security")
const { monitoringMiddleware, securityMonitor } = require("./middleware/monitoring")

const app = express()
const PORT = process.env.PORT || 3000

app.set("trust proxy", 1) // Trust first proxy for rate limiting

// Security monitoring
app.use(monitoringMiddleware)

// IP filtering
app.use(ipFilter)

// Request size limiting
app.use(requestSizeLimit)

// Enhanced security headers
app.use(securityHeaders)

// Enhanced helmet configuration
app.use(helmetConfig)

// General rate limiting
app.use(rateLimits.general)

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}
app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(cookieParser())

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    name: "sessionId", // Change default session name
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // CSRF protection
    },
    rolling: true, // Reset expiry on activity
  }),
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())
require("./config/passport")

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  },
})

// Serve static files
app.use(express.static("public"))

app.use("/auth", rateLimits.auth, csrfProtection, authRoutes)
app.use("/api", commentRoutes)

// Basic route for testing
app.get("/", csrfProtection, (req, res) => {
  res.json({
    status: "success",
    message: "Comment System API is running",
    user: req.user || null,
    csrfToken: req.csrfToken(),
  })
})

app.use((error, req, res, next) => {
  // Log security-related errors
  if (error.code === "EBADCSRFTOKEN") {
    securityMonitor.logSuspiciousActivity(req, "Invalid CSRF token")
    return res.status(403).json({
      status: "error",
      message: "Invalid CSRF token",
    })
  }

  if (error.type === "entity.too.large") {
    securityMonitor.logSuspiciousActivity(req, "Request entity too large")
    return res.status(413).json({
      status: "error",
      message: "Request entity too large",
    })
  }

  // Log other errors
  console.error("Error:", error)

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : error.message

  res.status(500).json({
    status: "error",
    message,
  })
})

// Start server
async function startServer() {
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error("❌ Cannot start server without database connection")
    process.exit(1)
  }

  const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1")

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`)
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`)

    if (process.env.NODE_ENV === "production") {
      console.log("🔒 Production mode - ensure firewall and reverse proxy are configured")
      console.log("🔒 Server listening on all interfaces - use reverse proxy for external access")
    } else {
      console.log("🔒 Development mode - server only accessible from localhost")
    }
  })
}

startServer()

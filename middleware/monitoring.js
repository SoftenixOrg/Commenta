const fs = require("fs")
const path = require("path")

class SecurityMonitor {
  constructor() {
    this.logFile = path.join(__dirname, "../logs/security.log")
    this.ensureLogDirectory()
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  log(event, details = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      event,
      ...details,
    }

    const logLine = JSON.stringify(logEntry) + "\n"

    fs.appendFile(this.logFile, logLine, (err) => {
      if (err) {
        console.error("Failed to write security log:", err)
      }
    })

    if (process.env.NODE_ENV !== "production") {
      console.log("Security Event:", logEntry)
    }
  }

  logFailedAuth(req, reason) {
    this.log("FAILED_AUTH", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      reason,
      path: req.path,
    })
  }

  logSuspiciousActivity(req, activity) {
    this.log("SUSPICIOUS_ACTIVITY", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      activity,
      path: req.path,
      userId: req.user?.id,
    })
  }

  logRateLimitHit(req) {
    this.log("RATE_LIMIT_HIT", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      userId: req.user?.id,
    })
  }

  logSpamAttempt(req, content) {
    this.log("SPAM_ATTEMPT", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id,
      contentLength: content?.length,
      contentPreview: content?.substring(0, 100),
    })
  }
}

const securityMonitor = new SecurityMonitor()

// Monitoring middleware
const monitoringMiddleware = (req, res, next) => {
  const userAgent = req.get("User-Agent") || ""
  const suspiciousPatterns = [/bot|crawler|spider|scraper/i, /curl|wget|python|php/i, /sqlmap|nikto|nmap/i]

  if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
    securityMonitor.logSuspiciousActivity(req, `Suspicious User-Agent: ${userAgent}`)
  }

  // Monitor for SQL injection attempts in query params
  const queryString = req.url.split("?")[1] || ""
  const sqlPatterns = [/union|select|insert|update|delete|drop|create|alter/i, /--|\/\*|\*\/|;/]

  if (sqlPatterns.some((pattern) => pattern.test(queryString))) {
    securityMonitor.logSuspiciousActivity(req, `Potential SQL injection in query: ${queryString}`)
  }

  next()
}

module.exports = {
  securityMonitor,
  monitoringMiddleware,
}

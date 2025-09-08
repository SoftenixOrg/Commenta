// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    })
  }
  next()
}

// Check if user owns the resource
function requireOwnership(req, res, next) {
  const userId = Number.parseInt(req.params.userId) || Number.parseInt(req.body.userId)

  if (!req.user || req.user.id !== userId) {
    return res.status(403).json({
      status: "error",
      message: "Access denied",
    })
  }
  next()
}

module.exports = { requireAuth, requireOwnership }

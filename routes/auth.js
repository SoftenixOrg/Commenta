const express = require("express")
const passport = require("passport")
const router = express.Router()

// Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
)

// Google OAuth callback
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => {
  // Successful authentication
  const redirectUrl = req.session.returnTo || "/"
  delete req.session.returnTo
  res.redirect(redirectUrl)
})

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        status: "error",
        message: "Logout failed",
      })
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          status: "error",
          message: "Session destruction failed",
        })
      }

      res.clearCookie("connect.sid")
      res.json({
        status: "success",
        message: "Logged out successfully",
      })
    })
  })
})

// Check authentication status
router.get("/status", (req, res) => {
  res.json({
    status: "success",
    authenticated: !!req.user,
    user: req.user || null,
  })
})

module.exports = router

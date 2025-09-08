const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const { pool } = require("./database")

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id
        const email = profile.emails[0].value
        const username = profile.displayName
        const avatarUrl = profile.photos[0].value

        const [existingUsers] = await pool.execute("SELECT * FROM users WHERE google_id = ? OR email = ?", [
          googleId,
          email,
        ])

        if (existingUsers.length > 0) {
          await pool.execute("UPDATE u sers SET username = ?, avatar_url = ? WHERE id = ?", [
            username,
            avatarUrl,
            existingUsers[0].id,
          ])
          return done(null, existingUsers[0])
        }

        const [result] = await pool.execute(
          "INSERT INTO users (google_id, username, email, avatar_url) VALUES (?, ?, ?, ?)",
          [googleId, username, email, avatarUrl],
        )

        const [newUser] = await pool.execute("SELECT * FROM users WHERE id = ?", [result.insertId])

        return done(null, newUser[0])
      } catch (error) {
        console.error("Google OAuth error:", error)
        return done(error, null)
      }
    },
  ),
)

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.execute("SELECT * FROM users WHERE id = ?", [id])
    done(null, users[0] || null)
  } catch (error) {
    done(error, null)
  }
})

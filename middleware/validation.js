const sanitizeHtml = require("sanitize-html")

// Input validation and sanitization
class InputValidator {
  static sanitizeString(input, maxLength = 1000) {
    if (typeof input !== "string") {
      throw new Error("Input must be a string")
    }

    const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

    if (cleaned.length > maxLength) {
      throw new Error(`Input too long (max ${maxLength} characters)`)
    }

    return cleaned.trim()
  }

  static sanitizeHtml(input) {
    return sanitizeHtml(input, {
      allowedTags: ["b", "i", "em", "strong", "a", "br", "p"],
      allowedAttributes: {
        a: ["href", "title"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      allowedSchemesByTag: {
        a: ["http", "https", "mailto"],
      },
      transformTags: {
        a: (tagName, attribs) => {
          return {
            tagName: "a",
            attribs: {
              ...attribs,
              rel: "nofollow noopener noreferrer",
              target: "_blank",
            },
          }
        },
      },
    })
  }

  static validateContentId(contentId) {
    if (!contentId || typeof contentId !== "string") {
      throw new Error("Content ID is required")
    }

    if (!/^[a-zA-Z0-9\-_/.]+$/.test(contentId)) {
      throw new Error("Invalid content ID format")
    }

    if (contentId.length > 255) {
      throw new Error("Content ID too long")
    }

    return contentId
  }

  static validateComment(content) {
    if (!content || typeof content !== "string") {
      throw new Error("Comment content is required")
    }

    const sanitized = this.sanitizeString(content, 2000)

    if (sanitized.length < 1) {
      throw new Error("Comment cannot be empty")
    }

    // Check for spam patterns
    if (this.isSpamContent(sanitized)) {
      throw new Error("Comment appears to be spam")
    }

    return this.sanitizeHtml(sanitized)
  }

  static isSpamContent(content) {
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /(https?:\/\/[^\s]+){3,}/, // Multiple URLs
      /\b(buy|sale|discount|offer|free|win|prize|money|cash|loan|credit)\b.*\b(now|today|click|visit|call)\b/i, // Spam keywords
      /[A-Z]{10,}/, // Excessive caps
    ]

    return spamPatterns.some((pattern) => pattern.test(content))
  }

  static validatePagination(page, limit) {
    const pageNum = Number.parseInt(page) || 1
    const limitNum = Number.parseInt(limit) || 20

    if (pageNum < 1) {
      throw new Error("Page must be positive")
    }

    if (limitNum < 1 || limitNum > 50) {
      throw new Error("Limit must be between 1 and 50")
    }

    return { page: pageNum, limit: limitNum }
  }
}

// Validation middleware
const validateCommentInput = (req, res, next) => {
  try {
    const { content_id, content, parent_id } = req.body

    // Validate and sanitize inputs
    req.body.content_id = InputValidator.validateContentId(content_id)
    req.body.content = InputValidator.validateComment(content)

    if (parent_id !== null && parent_id !== undefined) {
      const parentIdNum = Number.parseInt(parent_id)
      if (isNaN(parentIdNum) || parentIdNum < 1) {
        throw new Error("Invalid parent ID")
      }
      req.body.parent_id = parentIdNum
    }

    next()
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    })
  }
}

const validateQueryParams = (req, res, next) => {
  try {
    const { content_id, page, limit } = req.query

    if (content_id) {
      req.query.content_id = InputValidator.validateContentId(content_id)
    }

    if (page || limit) {
      const validated = InputValidator.validatePagination(page, limit)
      req.query.page = validated.page
      req.query.limit = validated.limit
    }

    next()
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    })
  }
}

module.exports = {
  InputValidator,
  validateCommentInput,
  validateQueryParams,
}

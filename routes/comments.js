const express = require('express');
const { requireAuth } = require('../middleware/auth');
const CommentService = require('../services/commentService');
const { rateLimits } = require('../middleware/security');
const { validateCommentInput, validateQueryParams } = require('../middleware/validation');
const { securityMonitor } = require('../middleware/monitoring');

const router = express.Router();

// Create comment with enhanced security
router.post('/comments', rateLimits.comments, requireAuth, validateCommentInput, async (req, res) => {
  try {
    const { content_id, parent_id, content } = req.body;

    const comment = await CommentService.createComment({
      contentId: content_id,
      parentId : parent_id,
      userId   : req.user.id,
      content  : content,
    });

    res.status(201).json({
      status : 'success',
      message: 'Comment created successfully',
      data   : comment,
    });
  } catch (error) {
    if (error.message.includes('spam') || error.message.includes('duplicate')) {
      securityMonitor.logSpamAttempt(req, req.body.content);
    }

    res.status(400).json({
      status : 'error',
      message: error.message,
    });
  }
});

// Get comments with validation
router.get('/comments', validateQueryParams, async (req, res) => {
  try {
    const { content_id, page = 1, limit = 20 } = req.query;

    if (!content_id) {
      return res.status(400).json({
        status : 'error',
        message: 'Content ID is required',
      });
    }

    const result = await CommentService.getCommentsByContentId(
      content_id,
      Number.parseInt(page),
      Math.min(Number.parseInt(limit), 50), // Max 50 per page
    );

    res.json({
      status: 'success',
      data  : result,
    });
  } catch (error) {
    res.status(500).json({
      status : 'error',
      message: error.message,
    });
  }
});

// Update comment with enhanced validation
router.put('/comments/:id', requireAuth, validateCommentInput, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await CommentService.updateComment(Number.parseInt(id), req.user.id, content.trim());

    res.json({
      status : 'success',
      message: 'Comment updated successfully',
      data   : comment,
    });
  } catch (error) {
    res.status(400).json({
      status : 'error',
      message: error.message,
    });
  }
});

// Delete comment (unchanged)
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await CommentService.deleteComment(Number.parseInt(id), req.user.id);

    res.json({
      status : 'success',
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      status : 'error',
      message: error.message,
    });
  }
});

router.post('/comments/:id/like', requireAuth, rateLimits.likes, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const comment = await CommentService.likeComment(Number.parseInt(id), userId);

    res.json({
      status : 'success',
      message: 'Comment liked successfully',
      data   : comment,
    });
  } catch (error) {
    res.status(400).json({
      status : 'error',
      message: error.message,
    });
  }
});

module.exports = router;

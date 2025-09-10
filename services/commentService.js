const { pool } = require("../config/database")
const sanitizeHtml = require("sanitize-html")

class CommentService {
  // Sanitize comment content
  static sanitizeContent(content) {
    return sanitizeHtml(content, {
      allowedTags: ["b", "i", "em", "strong", "a", "br"],
      allowedAttributes: {
        a: ["href"],
      },
      allowedSchemes: ["http", "https", "mailto"],
    })
  }

  // Anti-spam check: same user, 10 seconds interval
  static async checkSpamByUser(userId) {
    const [recentComments] = await pool.execute(
      "SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)",
      [userId],
    )
    return recentComments[0].count >= 2
  }

  // Anti-spam check: duplicate content
  static async checkDuplicateContent(content, userId) {
    const [duplicates] = await pool.execute(
      "SELECT COUNT(*) as count FROM comments WHERE content = ? AND user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [content, userId],
    )
    return duplicates[0].count > 0
  }

  // Create new comment
  static async createComment(data) {
    const { contentId, parentId, userId, content } = data
    const sanitizedContent = this.sanitizeContent(content)

    // Anti-spam checks
    const isSpamByTime = await this.checkSpamByUser(userId)
    if (isSpamByTime) {
      throw new Error("Too many comments in short time. Please wait.")
    }


    // const isDuplicate = await this.checkDuplicateContent(sanitizedContent, userId)
    // if (isDuplicate) {
    //   throw new Error("Duplicate comment detected.")
    // }

    if (parentId) {
      const [parentComment] = await pool.execute(
        "SELECT id, content_id FROM comments WHERE id = ? AND status = 'visible'",
        [parentId],
      )

      if (parentComment.length === 0) {
        throw new Error("Parent comment not found")
      }

      if (parentComment[0].content_id !== contentId) {
        throw new Error("Parent comment belongs to different content")
      }
    }

    const [result] = await pool.execute(
      "INSERT INTO comments (content_id, parent_id, user_id, content) VALUES (?, ?, ?, ?)",
      [contentId, parentId || null, userId, sanitizedContent],
    )

    return this.getCommentById(result.insertId)
  }

  static async getCommentById(id) {
    const [comments] = await pool.execute(
      `
      SELECT c.*, u.username, u.avatar_url 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `,
      [id],
    )

    return comments[0] || null
  }

  static async getCommentsByContentId(contentId, page = 1, limit = 20) {
    const offset = (page - 1) * limit
    const limitInt = parseInt(limit, 10)
    const offsetInt = parseInt(offset, 10)

    const [rootComments] = await pool.query(
      `
  SELECT c.*, u.username, u.avatar_url,
    (SELECT COUNT(*) FROM comments WHERE parent_id = c.id AND status = 'visible') as reply_count
  FROM comments c 
  JOIN users u ON c.user_id = u.id 
  WHERE c.content_id = ? AND c.parent_id IS NULL AND c.status = 'visible'
  ORDER BY c.created_at DESC
  LIMIT ${limitInt} OFFSET ${offsetInt}
  `,
      [contentId]
    )

    for (const comment of rootComments) {
      const [replies] = await pool.execute(
        `
        SELECT c.*, u.username, u.avatar_url
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.parent_id = ? AND c.status = 'visible'
        ORDER BY c.created_at ASC
      `,
        [comment.id],
      )

      comment.replies = replies
    }

    // Get total count
    const [totalCount] = await pool.execute(
      "SELECT COUNT(*) as total FROM comments WHERE content_id = ? AND parent_id IS NULL AND status = 'visible'",
      [contentId],
    )

    return {
      comments: rootComments,
      pagination: {
        page,
        limit,
        total: totalCount[0].total,
        totalPages: Math.ceil(totalCount[0].total / limit),
      },
    }
  }

  // Update comment
  static async updateComment(id, userId, content) {
    const sanitizedContent = this.sanitizeContent(content)

    const [result] = await pool.execute(
      "UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND status = 'visible'",
      [sanitizedContent, id, userId],
    )

    if (result.affectedRows === 0) {
      throw new Error("Comment not found or access denied")
    }

    return this.getCommentById(id)
  }

  // Soft delete comment
  static async deleteComment(id, userId) {
    const [result] = await pool.execute("UPDATE comments SET status = 'deleted' WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ])

    if (result.affectedRows === 0) {
      throw new Error("Comment not found or access denied")
    }

    return true
  }

  // Like comment
  static async likeComment(commentId, userId) {
    const connection = await pool.getConnection(); // Transaction için bağlantı al
    await connection.beginTransaction();

    try {
      // 1. Kullanıcının bu yorumu daha önce beğenip beğenmediğini kontrol et
      const [existingLike] = await connection.execute(
        "SELECT id FROM likes WHERE user_id = ? AND comment_id = ?",
        [userId, commentId]
      );

      let liked = false;

      if (existingLike.length > 0) {
        // 2a. Eğer zaten beğenmişse: beğeniyi geri al
        // likes tablosundan kaydı sil
        await connection.execute("DELETE FROM likes WHERE id = ?", [existingLike[0].id]);

        // comments tablosundaki sayacı azalt (0'ın altına düşmemesini sağla)
        await connection.execute(
          "UPDATE comments SET likes = GREATEST(0, likes - 1) WHERE id = ?",
          [commentId]
        );
        liked = false; // Beğeni geri alındı
      } else {
        // 2b. Eğer beğenmemişse: beğeniyi ekle
        // likes tablosuna yeni kayıt ekle
        await connection.execute("INSERT INTO likes (user_id, comment_id) VALUES (?, ?)", [userId, commentId]);

        // comments tablosundaki sayacı artır
        await connection.execute("UPDATE comments SET likes = likes + 1 WHERE id = ?", [commentId]);
        liked = true; // Beğeni eklendi
      }

      // 3. Transaction'ı onayla
      await connection.commit();

      // 4. Güncellenmiş yorum bilgisini ve beğeni durumunu döndür
      const updatedComment = await this.getCommentById(commentId);
      return { updatedComment, liked };

    } catch (error) {
      // Hata olursa tüm işlemleri geri al
      await connection.rollback();
      console.error("Like comment transaction failed:", error);
      throw new Error("Could not update like status.");
    } finally {
      // Bağlantıyı serbest bırak
      connection.release();
    }
  }
}

module.exports = CommentService

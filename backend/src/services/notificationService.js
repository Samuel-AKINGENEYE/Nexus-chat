const { prisma } = require('../lib/prisma');

class NotificationService {
  // Create a notification
  static async create(userId, type, title, body, data = {}) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data,
          deliveredAt: new Date()
        }
      });
      
      // Emit via WebSocket if available
      const req = require('../server');
      if (req.io) {
        req.io.to(`user:${userId}`).emit('notification', notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      return null;
    }
  }
  
  // Get user's notifications
  static async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where: { userId } })
    ]);
    
    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });
  }
  
  // Mark all as read
  static async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
  
  // Get unread count
  static async getUnreadCount(userId) {
    return prisma.notification.count({
      where: { userId, isRead: false }
    });
  }
  
  // Trigger on new comment
  static async onNewComment(postId, commentId, authorId) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    });
    
    if (post && post.authorId !== authorId) {
      await this.create(
        post.authorId,
        'COMMENT_ON_POST',
        'New comment on your post',
        `${authorId} commented on "${post.title.substring(0, 50)}"`,
        { postId, commentId, authorId }
      );
    }
  }
  
  // Trigger on reply to comment
  static async onReplyToComment(parentCommentId, replyId, authorId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentCommentId },
      include: { author: true }
    });
    
    if (parentComment && parentComment.authorId !== authorId) {
      await this.create(
        parentComment.authorId,
        'REPLY_TO_COMMENT',
        'Someone replied to your comment',
        `${authorId} replied to your comment`,
        { parentCommentId, replyId, authorId }
      );
    }
  }
  
  // Trigger on mention
  static async onMention(mentionedUserId, postId, commentId, mentionerId) {
    await this.create(
      mentionedUserId,
      'MENTION',
      'You were mentioned',
      `${mentionerId} mentioned you in a post`,
      { postId, commentId, mentionerId }
    );
  }
  
  // Trigger on new DM
  static async onNewDM(userId, senderId, messageId) {
    await this.create(
      userId,
      'NEW_DM',
      'New message received',
      `${senderId} sent you a message`,
      { messageId, senderId }
    );
  }
}

module.exports = NotificationService;

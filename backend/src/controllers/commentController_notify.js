// Add to your existing commentController.js
// Import at the top:
// const NotificationService = require('../services/notificationService');

// Inside createComment function, after saving the comment:
// Add these lines:

/*
// Trigger notifications
if (!parentId) {
  await NotificationService.onNewComment(postId, comment.id, userId);
} else {
  await NotificationService.onReplyToComment(parentId, comment.id, userId);
}
*/

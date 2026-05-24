const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const moderationController = require('../controllers/moderationController');

// Check if user is moderator (simplified - would check roles)
const isModerator = async (req, res, next) => {
  // For now, allow all authenticated users
  // In production, check user's role in space
  next();
};

// Report routes (any authenticated user)
router.post('/reports', authenticate, moderationController.createReport);

// Moderation routes (moderator only)
router.get('/reports', authenticate, isModerator, moderationController.getReports);
router.put('/reports/:id/resolve', authenticate, isModerator, moderationController.resolveReport);
router.get('/logs', authenticate, isModerator, moderationController.getModerationLogs);

module.exports = router;

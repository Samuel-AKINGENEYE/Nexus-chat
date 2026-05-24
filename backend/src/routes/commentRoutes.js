const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

const validateCommentCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Comment must be between 1 and 10000 characters'),
  body('postId')
    .notEmpty()
    .withMessage('Post ID is required'),
  body('parentId')
    .optional()
    .isString()
    .withMessage('Invalid parent comment ID')
];

// Public routes
router.get('/post/:postId', commentController.getPostComments);

// Protected routes
router.post('/', authenticate, validateCommentCreation, commentController.createComment);
router.post('/:id/vote', authenticate, commentController.voteComment);
router.patch('/:id', authenticate, commentController.editComment);
router.delete('/:id', authenticate, commentController.deleteComment);

module.exports = router;

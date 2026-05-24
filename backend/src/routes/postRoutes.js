const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');

const validatePostCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 300 })
    .withMessage('Title must be between 3 and 300 characters'),
  body('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content cannot exceed 10000 characters'),
  body('spaceSlug')
    .notEmpty()
    .withMessage('Space slug is required'),
  body('type')
    .optional()
    .isIn(['TEXT', 'IMAGE', 'LINK', 'POLL'])
    .withMessage('Invalid post type')
];

// Public routes
router.get('/space/:slug', postController.getSpacePosts);
router.get('/:id', postController.getPost);

// Protected routes
router.post('/', authenticate, validatePostCreation, postController.createPost);
router.patch('/:id', authenticate, postController.editPost);
router.delete('/:id', authenticate, postController.deletePost);

module.exports = router;

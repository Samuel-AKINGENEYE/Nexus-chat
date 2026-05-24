const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const spaceController = require('../controllers/spaceController');
const { authenticate } = require('../middleware/auth');

// Validation rules
const validateSpaceCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Space name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Space name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('visibility')
    .optional()
    .isIn(['PUBLIC', 'RESTRICTED', 'PRIVATE'])
    .withMessage('Invalid visibility setting'),
  body('categoryTags')
    .optional()
    .isArray()
    .withMessage('Category tags must be an array')
];

// Public routes
router.get('/', spaceController.listSpaces);
router.get('/:slug', spaceController.getSpace);

// Protected routes (require authentication)
router.post('/', authenticate, validateSpaceCreation, spaceController.createSpace);
router.post('/:slug/join', authenticate, spaceController.joinSpace);
router.post('/:slug/leave', authenticate, spaceController.leaveSpace);
router.put('/:slug', authenticate, spaceController.updateSpace);

module.exports = router;

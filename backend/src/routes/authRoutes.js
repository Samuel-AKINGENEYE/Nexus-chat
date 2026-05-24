const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validators');
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../lib/prisma');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, username: true, email: true,
        displayName: true, bio: true, avatarUrl: true,
        emailVerified: true, createdAt: true, lastSeenAt: true,
        _count: { select: { posts: true, comments: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update current user profile
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const data = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (bio !== undefined) data.bio = bio;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: {
        id: true, username: true, email: true,
        displayName: true, bio: true, avatarUrl: true
      }
    });
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;

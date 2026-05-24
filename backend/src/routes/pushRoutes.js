const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../lib/prisma');

// Register device token for push notifications
router.post('/register', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.userId;
    
    if (!token || !platform) {
      return res.status(400).json({ error: 'Token and platform required' });
    }
    
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform }
    });
    
    res.json({ message: 'Device registered successfully', deviceToken });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Unregister device token
router.post('/unregister', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    await prisma.deviceToken.deleteMany({
      where: { token }
    });
    
    res.json({ message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Unregister device error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

// Get user's registered devices
router.get('/devices', authenticate, async (req, res) => {
  try {
    const devices = await prisma.deviceToken.findMany({
      where: { userId: req.user.userId },
      select: { id: true, platform: true, createdAt: true }
    });
    
    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

module.exports = router;

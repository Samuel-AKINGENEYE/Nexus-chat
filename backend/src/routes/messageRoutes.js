const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../lib/prisma');

// Get conversations for user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.user.userId } }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get messages in conversation
router.get('/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;
    
    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
      }
    });
    
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = router;

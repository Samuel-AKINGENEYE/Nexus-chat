const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { prisma } = require('../lib/prisma');

// Vote on a post
router.post('/posts/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body;
    const userId = req.user.userId;
    
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const existingVote = await prisma.vote.findUnique({
      where: { userId_postId: { userId, postId: id } }
    });
    
    if (existingVote) {
      await prisma.vote.delete({ where: { id: existingVote.id } });

      // Decrement based on the vote that was cast, not the incoming request type
      const updateData = existingVote.type === 'UPVOTE'
        ? { upvotes: { decrement: 1 } }
        : { downvotes: { decrement: 1 } };
      await prisma.post.update({ where: { id }, data: updateData });
      
      const updatedPost = await prisma.post.findUnique({ where: { id } });
      return res.json({ message: 'Vote removed', upvotes: updatedPost.upvotes, downvotes: updatedPost.downvotes });
    }
    
    await prisma.vote.create({
      data: { userId, postId: id, type: voteType === 'up' ? 'UPVOTE' : 'DOWNVOTE' }
    });
    
    const updateData = voteType === 'up'
      ? { upvotes: { increment: 1 } }
      : { downvotes: { increment: 1 } };
    await prisma.post.update({ where: { id }, data: updateData });
    
    const updatedPost = await prisma.post.findUnique({ where: { id } });
    res.json({ message: `Post ${voteType}voted`, upvotes: updatedPost.upvotes, downvotes: updatedPost.downvotes });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

router.get('/posts/:id/votes', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id },
      select: { upvotes: true, downvotes: true }
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ upvotes: post.upvotes, downvotes: post.downvotes, score: post.upvotes - post.downvotes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get votes' });
  }
});

module.exports = router;

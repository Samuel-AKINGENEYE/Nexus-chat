const { prisma } = require('../lib/prisma');
const { validationResult } = require('express-validator');

// Create a comment (with threading support)
const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { content, postId, parentId } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Calculate depth for threading (max 6 levels)
    let depth = 0;
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      depth = Math.min(parentComment.depth + 1, 6);
      
      if (depth >= 6) {
        return res.status(400).json({ error: 'Maximum nesting depth (6) reached' });
      }
    }
    
    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        postId,
        parentId,
        depth
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });
    
    // Update post comment count
    await prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } }
    });
    
    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// Get comments for a post (with threading)
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { sort = 'best', limit = 50 } = req.query;
    
    // Build comments tree structure
    let orderBy = {};
    switch (sort) {
      case 'best':
        orderBy = { upvotes: 'desc' };
        break;
      case 'new':
        orderBy = { createdAt: 'desc' };
        break;
      case 'top':
        orderBy = { upvotes: 'desc' };
        break;
      case 'controversial':
        orderBy = { upvotes: { sort: 'desc' }, downvotes: 'desc' };
        break;
      default:
        orderBy = { upvotes: 'desc' };
    }
    
    // Get top-level comments first
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
        deletedAt: null
      },
      take: parseInt(limit),
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        replies: {
          where: { deletedAt: null },
          orderBy: { upvotes: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            },
            replies: {
              where: { deletedAt: null },
              orderBy: { upvotes: 'desc' },
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Recursively build comment tree
    const buildCommentTree = (commentList) => {
      return commentList.map(comment => ({
        ...comment,
        replies: comment.replies ? buildCommentTree(comment.replies) : []
      }));
    };
    
    const commentTree = buildCommentTree(comments);
    
    res.json({
      comments: commentTree,
      count: comments.length,
      sort
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

// Vote on comment
const voteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body; // 'up' or 'down'
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const comment = await prisma.comment.findUnique({
      where: { id }
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Update vote counts
    const updateData = voteType === 'up' 
      ? { upvotes: { increment: 1 } }
      : { downvotes: { increment: 1 } };
    
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      message: `Comment ${voteType}voted`,
      upvotes: updatedComment.upvotes,
      downvotes: updatedComment.downvotes
    });
  } catch (error) {
    console.error('Vote comment error:', error);
    res.status(500).json({ error: 'Failed to vote on comment' });
  }
};

// Delete comment (soft delete)
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        post: {
          include: {
            space: {
              include: {
                members: {
                  where: {
                    userId,
                    role: { in: ['OWNER', 'MODERATOR'] }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const isAuthor = comment.authorId === userId;
    const isModerator = comment.post.space.members.length > 0;
    
    if (!isAuthor && !isModerator) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await prisma.comment.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        content: '[deleted]'
      }
    });
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = {
  createComment,
  getPostComments,
  voteComment,
  deleteComment
};

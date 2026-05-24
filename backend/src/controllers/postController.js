const { prisma } = require('../lib/prisma');
const { validationResult } = require('express-validator');

const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, content, spaceSlug, type, mediaUrls, linkUrl } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const space = await prisma.space.findUnique({
      where: { slug: spaceSlug }
    });
    
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    if (space.visibility === 'RESTRICTED') {
      const membership = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId: space.id,
            userId
          }
        }
      });
      
      if (!membership || membership.role === 'GUEST') {
        return res.status(403).json({ error: 'You must be a member to post in this space' });
      }
    }
    
    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: userId,
        spaceId: space.id,
        type: type || 'TEXT',
        mediaUrls: mediaUrls || [],
        linkUrl: linkUrl || null
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
    
    await prisma.space.update({
      where: { id: space.id },
      data: { postCount: { increment: 1 } }
    });
    
    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

const getSpacePosts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = 'new' } = req.query;
    const skip = (page - 1) * limit;
    
    const space = await prisma.space.findUnique({
      where: { slug }
    });
    
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    let orderBy = {};
    switch (sort) {
      case 'new':
        orderBy = { createdAt: 'desc' };
        break;
      case 'top':
        orderBy = { upvotes: 'desc' };
        break;
      case 'hot':
        orderBy = { commentCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }
    
    const posts = await prisma.post.findMany({
      where: { spaceId: space.id },
      skip,
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
        }
      }
    });
    
    const total = await prisma.post.count({
      where: { spaceId: space.id }
    });
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        space: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
};

const editPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.userId;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'Not your post' });
    if (Date.now() - new Date(post.createdAt).getTime() > 15 * 60 * 1000) {
      return res.status(403).json({ error: 'Edit window (15 minutes) has passed' });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { title: title.trim(), content: content?.trim() ?? post.content }
    });

    res.json({ message: 'Post updated', post: updated });
  } catch (error) {
    console.error('Edit post error:', error);
    res.status(500).json({ error: 'Failed to edit post' });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const post = await prisma.post.findUnique({
      where: { id },
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
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const isAuthor = post.authorId === userId;
    const isModerator = post.space.members.length > 0;
    
    if (!isAuthor && !isModerator) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await prisma.post.delete({ where: { id } });
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

module.exports = {
  createPost,
  getSpacePosts,
  getPost,
  editPost,
  deletePost
};

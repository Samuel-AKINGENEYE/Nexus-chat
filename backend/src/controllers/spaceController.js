const { prisma } = require('../lib/prisma');
const { validationResult } = require('express-validator');

// Helper to generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Create a new space
const createSpace = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, description, visibility, categoryTags, rules } = req.body;
    const userId = req.user?.userId; // From auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Generate unique slug
    let slug = generateSlug(name);
    let existingSpace = await prisma.space.findUnique({ where: { slug } });
    let counter = 1;
    
    while (existingSpace) {
      slug = `${generateSlug(name)}-${counter}`;
      existingSpace = await prisma.space.findUnique({ where: { slug } });
      counter++;
    }
    
    // Create space
    const space = await prisma.space.create({
      data: {
        name,
        slug,
        description,
        visibility: visibility || 'PUBLIC',
        categoryTags: categoryTags || [],
        rules: rules || [],
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        members: {
          where: { role: 'OWNER' },
          take: 1
        }
      }
    });
    
    res.status(201).json({
      message: 'Space created successfully',
      space
    });
  } catch (error) {
    console.error('Create space error:', error);
    res.status(500).json({ error: 'Failed to create space' });
  }
};

// Get space by slug
const getSpace = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const space = await prisma.space.findUnique({
      where: { slug },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          take: 5,
          include: {
            user: {
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
    });
    
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    res.json({ space });
  } catch (error) {
    console.error('Get space error:', error);
    res.status(500).json({ error: 'Failed to get space' });
  }
};

// List spaces with filtering
const listSpaces = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, visibility, search } = req.query;
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (category) {
      where.categoryTags = { has: category };
    }
    
    if (visibility) {
      where.visibility = visibility;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const spaces = await prisma.space.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { memberCount: 'desc' },
      include: {
        creator: {
          select: {
            username: true,
            displayName: true
          }
        }
      }
    });
    
    const total = await prisma.space.count({ where });
    
    res.json({
      spaces,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List spaces error:', error);
    res.status(500).json({ error: 'Failed to list spaces' });
  }
};

// Join a space
const joinSpace = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const space = await prisma.space.findUnique({
      where: { slug }
    });
    
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    // Check if already a member
    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: space.id,
          userId
        }
      }
    });
    
    if (existingMember) {
      return res.status(400).json({ error: 'Already a member' });
    }
    
    // Add member
    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId,
        role: space.visibility === 'RESTRICTED' ? 'GUEST' : 'CONTRIBUTOR'
      }
    });
    
    // Update member count
    await prisma.space.update({
      where: { id: space.id },
      data: { memberCount: { increment: 1 } }
    });
    
    res.json({ message: 'Successfully joined space' });
  } catch (error) {
    console.error('Join space error:', error);
    res.status(500).json({ error: 'Failed to join space' });
  }
};

// Leave space
const leaveSpace = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const space = await prisma.space.findUnique({
      where: { slug }
    });
    
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    // Check if user is the owner
    const membership = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: space.id,
          userId
        }
      }
    });
    
    if (!membership) {
      return res.status(400).json({ error: 'Not a member' });
    }
    
    if (membership.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first or delete space.' });
    }
    
    // Remove member
    await prisma.spaceMember.delete({
      where: {
        spaceId_userId: {
          spaceId: space.id,
          userId
        }
      }
    });
    
    // Update member count
    await prisma.space.update({
      where: { id: space.id },
      data: { memberCount: { decrement: 1 } }
    });
    
    res.json({ message: 'Successfully left space' });
  } catch (error) {
    console.error('Leave space error:', error);
    res.status(500).json({ error: 'Failed to leave space' });
  }
};

// Update space settings (moderator only)
const updateSpace = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    const { name, description, visibility, categoryTags, rules, avatarUrl, bannerUrl } = req.body;
    
    const space = await prisma.space.findUnique({
      where: { slug },
      include: {
        members: {
          where: {
            userId,
            role: { in: ['OWNER', 'MODERATOR'] }
          }
        }
      }
    });
    
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    if (space.members.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (visibility) updateData.visibility = visibility;
    if (categoryTags) updateData.categoryTags = categoryTags;
    if (rules) updateData.rules = rules;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (bannerUrl) updateData.bannerUrl = bannerUrl;
    
    const updatedSpace = await prisma.space.update({
      where: { id: space.id },
      data: updateData
    });
    
    res.json({ message: 'Space updated successfully', space: updatedSpace });
  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({ error: 'Failed to update space' });
  }
};

module.exports = {
  createSpace,
  getSpace,
  listSpaces,
  joinSpace,
  leaveSpace,
  updateSpace
};

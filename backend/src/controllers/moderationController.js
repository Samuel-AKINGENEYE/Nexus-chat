const { prisma } = require('../lib/prisma');

// Report content
const createReport = async (req, res) => {
  try {
    const { postId, commentId, reason } = req.body;
    const reporterId = req.user.userId;
    
    if (!postId && !commentId) {
      return res.status(400).json({ error: 'Must report either a post or comment' });
    }
    
    const report = await prisma.report.create({
      data: {
        reporterId,
        postId,
        commentId,
        reason,
        status: 'PENDING'
      }
    });
    
    res.status(201).json({ message: 'Report submitted', report });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Get reports (moderator only)
const getReports = async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const reports = await prisma.report.findMany({
      where: { status },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
        post: { select: { id: true, title: true, authorId: true } },
        comment: { select: { id: true, content: true, authorId: true } }
      }
    });
    
    const total = await prisma.report.count({ where: { status } });
    
    res.json({
      reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
};

// Resolve report
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, modNotes } = req.body;
    const moderatorId = req.user.userId;
    
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Log moderation action
    await prisma.moderationLog.create({
      data: {
        moderatorId,
        action,
        targetType: report.postId ? 'POST' : 'COMMENT',
        targetId: report.postId || report.commentId,
        reason: modNotes || report.reason,
        spaceId: report.post?.spaceId
      }
    });
    
    // Update report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: action === 'delete' ? 'RESOLVED' : 'DISMISSED',
        resolvedAt: new Date(),
        resolvedBy: moderatorId,
        modNotes
      }
    });
    
    // If action is delete, soft delete the content
    if (action === 'delete') {
      if (report.postId) {
        await prisma.post.update({
          where: { id: report.postId },
          data: { deletedAt: new Date() }
        });
      } else if (report.commentId) {
        await prisma.comment.update({
          where: { id: report.commentId },
          data: { deletedAt: new Date(), content: '[removed by moderator]' }
        });
      }
    }
    
    res.json({ message: 'Report resolved', report: updatedReport });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

// Get moderation logs
const getModerationLogs = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await prisma.moderationLog.findMany({
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        moderator: { select: { id: true, username: true, displayName: true } },
        space: { select: { id: true, name: true, slug: true } }
      }
    });
    
    res.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
};

module.exports = {
  createReport,
  getReports,
  resolveReport,
  getModerationLogs
};

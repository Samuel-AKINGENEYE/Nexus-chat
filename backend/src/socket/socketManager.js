const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');

class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        credentials: true
      }
    });
    
    // Setup Redis adapter for scaling
    const pubClient = new Redis({
      host: 'localhost',
      port: 6380,
    });
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));
    
    this.setupMiddleware();
    this.setupEvents();
  }
  
  setupMiddleware() {
    // Authentication middleware for Socket.io
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        
        if (!user) {
          return next(new Error('User not found'));
        }
        
        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });
  }
  
  setupEvents() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User ${socket.userId} connected`);
      
      // Join user's personal room
      socket.join(`user:${socket.userId}`);
      
      // Handle private message
      socket.on('private_message', async (data) => {
        try {
          const { to, content, type = 'text' } = data;
          
          // Create conversation or get existing
          let conversation = await prisma.conversation.findFirst({
            where: {
              type: 'ONE_ON_ONE',
              participants: {
                every: {
                  userId: { in: [socket.userId, to] }
                }
              }
            }
          });
          
          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                type: 'ONE_ON_ONE',
                participants: {
                  create: [
                    { userId: socket.userId },
                    { userId: to }
                  ]
                }
              }
            });
          }
          
          // Save message
          const message = await prisma.message.create({
            data: {
              content,
              senderId: socket.userId,
              conversationId: conversation.id,
              status: 'SENT'
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true
                }
              }
            }
          });
          
          // Emit to recipient
          this.io.to(`user:${to}`).emit('new_message', message);
          
          // Update status to delivered
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'DELIVERED' }
          });
          
          // Acknowledge to sender
          socket.emit('message_sent', message);
          
        } catch (error) {
          console.error('Private message error:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });
      
      // Handle typing indicator
      socket.on('typing', ({ to, isTyping }) => {
        socket.to(`user:${to}`).emit('user_typing', {
          from: socket.userId,
          isTyping
        });
      });
      
      // Handle read receipt
      socket.on('mark_read', async ({ messageId, conversationId }) => {
        await prisma.message.updateMany({
          where: {
            id: messageId,
            conversationId,
            receiver: { some: { userId: socket.userId } }
          },
          data: { status: 'READ' }
        });
        
        socket.to(`conversation:${conversationId}`).emit('message_read', {
          messageId,
          userId: socket.userId
        });
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User ${socket.userId} disconnected`);
      });
    });
  }
  
  getIO() {
    return this.io;
  }
}

module.exports = SocketManager;

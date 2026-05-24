const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nexus_dev?schema=public'
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testNotifications() {
  console.log('🔔 Testing Notification Service...\n');
  
  try {
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        username: `notif_user1_${Date.now()}`,
        email: `notif1_${Date.now()}@test.com`,
        displayName: 'Notification User 1'
      }
    });
    
    const user2 = await prisma.user.create({
      data: {
        username: `notif_user2_${Date.now()}`,
        email: `notif2_${Date.now()}@test.com`,
        displayName: 'Notification User 2'
      }
    });
    console.log('✅ Test users created');
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: user2.id,
        type: 'COMMENT_ON_POST',
        title: 'New comment on your post',
        body: `${user1.username} commented on your post`,
        data: { test: true }
      }
    });
    console.log('✅ Notification created:', notification.title);
    
    // Get unread count
    const count = await prisma.notification.count({
      where: { userId: user2.id, isRead: false }
    });
    console.log(`✅ Unread count: ${count}`);
    
    // Mark as read
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true }
    });
    console.log('✅ Notification marked as read');
    
    // Clean up
    await prisma.notification.delete({ where: { id: notification.id } });
    await prisma.user.delete({ where: { id: user2.id } });
    await prisma.user.delete({ where: { id: user1.id } });
    
    console.log('\n🎉 All notification tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();

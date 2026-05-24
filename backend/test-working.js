// Simple test without complex imports
const { PrismaClient } = require('@prisma/client');

// Create client with explicit configuration
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔌 Testing database connection...\n');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Create a user
    const user = await prisma.user.create({
      data: {
        username: 'nexus_test_user',
        email: 'nexus_test@example.com',
        displayName: 'Nexus Test'
      }
    });
    console.log('✅ User created:', user.username, '(' + user.id + ')');
    
    // Create a post
    const post = await prisma.post.create({
      data: {
        title: 'My First Post',
        content: 'Hello from Nexus!',
        authorId: user.id,
        spaceId: 'test-space'
      }
    });
    console.log('✅ Post created:', post.title);
    
    // Create a comment
    const comment = await prisma.comment.create({
      data: {
        content: 'Great post!',
        authorId: user.id,
        postId: post.id
      }
    });
    console.log('✅ Comment created:', comment.content);
    
    // Query with relations
    const userWithPosts = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        posts: true,
        comments: true
      }
    });
    console.log(`\n📊 User ${userWithPosts.username} has ${userWithPosts.posts.length} post(s) and ${userWithPosts.comments.length} comment(s)`);
    
    // Clean up
    await prisma.comment.delete({ where: { id: comment.id } });
    await prisma.post.delete({ where: { id: post.id } });
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log('\n🎉 All tests passed! Database is working perfectly!');
    console.log('✅ NX-002 is complete and ready to close!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('PrismaClient')) {
      console.error('\n💡 Tip: Make sure prisma generate was run successfully');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nexus_dev?schema=public'
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testComments() {
  console.log('💬 Testing Threaded Comments...\n');
  
  try {
    // Create unique test user with timestamp
    const timestamp = Date.now();
    const user = await prisma.user.create({
      data: {
        username: `comment_tester_${timestamp}`,
        email: `comments_${timestamp}@test.com`,
        displayName: 'Comment Tester'
      }
    });
    console.log('✅ Test user created');
    
    // Create test space
    const space = await prisma.space.create({
      data: {
        name: `Comment Test Space ${timestamp}`,
        slug: `comment-test-space-${timestamp}`,
        visibility: 'PUBLIC',
        createdBy: user.id,
        members: {
          create: { userId: user.id, role: 'OWNER' }
        }
      }
    });
    console.log('✅ Test space created');
    
    // Create test post
    const post = await prisma.post.create({
      data: {
        title: 'Comment Test Post',
        content: 'Testing threaded comments',
        authorId: user.id,
        spaceId: space.id
      }
    });
    console.log('✅ Test post created');
    
    // Create top-level comment
    const comment1 = await prisma.comment.create({
      data: {
        content: 'This is a top-level comment!',
        authorId: user.id,
        postId: post.id,
        depth: 0
      }
    });
    console.log('✅ Top-level comment created');
    
    // Create reply (depth 1)
    const reply1 = await prisma.comment.create({
      data: {
        content: 'This is a reply to the comment',
        authorId: user.id,
        postId: post.id,
        parentId: comment1.id,
        depth: 1
      }
    });
    console.log('✅ Reply created (depth 1)');
    
    // Create nested reply (depth 2)
    const reply2 = await prisma.comment.create({
      data: {
        content: 'This is a nested reply!',
        authorId: user.id,
        postId: post.id,
        parentId: reply1.id,
        depth: 2
      }
    });
    console.log('✅ Nested reply created (depth 2)');
    
    // Fetch comments with hierarchy
    const comments = await prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`\n📊 Created ${comments.length} comments with threading`);
    comments.forEach(c => {
      const indent = '  '.repeat(c.depth);
      console.log(`${indent}📝 ${c.content} (depth: ${c.depth})`);
    });
    
    // Clean up
    await prisma.comment.deleteMany({ where: { postId: post.id } });
    await prisma.post.delete({ where: { id: post.id } });
    await prisma.spaceMember.deleteMany({ where: { spaceId: space.id } });
    await prisma.space.delete({ where: { id: space.id } });
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log('\n🎉 Threaded comments test passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testComments();

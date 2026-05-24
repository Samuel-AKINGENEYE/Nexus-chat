const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nexus_dev?schema=public'
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testPostCreation() {
  console.log('📝 Testing Post API...\n');
  
  try {
    // Create test user
    const user = await prisma.user.create({
      data: {
        username: 'post_tester_v2',
        email: 'poster2@test.com',
        displayName: 'Post Tester V2'
      }
    });
    console.log('✅ Test user created');
    
    // Create test space
    const space = await prisma.space.create({
      data: {
        name: 'Post Test Space V2',
        slug: 'post-test-space-v2',
        description: 'Testing post creation',
        visibility: 'PUBLIC',
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER'
          }
        }
      }
    });
    console.log('✅ Test space created');
    
    // Create a post
    const post = await prisma.post.create({
      data: {
        title: 'Welcome to Nexus!',
        content: 'This is our first test post',
        authorId: user.id,
        spaceId: space.id
      }
    });
    console.log('✅ Post created:', post.title);
    
    // Update space post count
    await prisma.space.update({
      where: { id: space.id },
      data: { postCount: { increment: 1 } }
    });
    
    // Fetch post with author
    const postWithAuthor = await prisma.post.findUnique({
      where: { id: post.id },
      include: { author: true, space: true }
    });
    console.log(`✅ Post "${postWithAuthor.title}" by ${postWithAuthor.author.displayName} in ${postWithAuthor.space.name}`);
    
    // Clean up
    await prisma.post.delete({ where: { id: post.id } });
    await prisma.spaceMember.deleteMany({ where: { spaceId: space.id } });
    await prisma.space.delete({ where: { id: space.id } });
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log('\n🎉 All post tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPostCreation();

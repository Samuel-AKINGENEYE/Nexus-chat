const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/nexus_dev?schema=public',
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma Client with the adapter
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔌 Testing database connection with adapter...\n');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database via adapter');
    
    // Create a user
    const user = await prisma.user.create({
      data: {
        username: 'nexus_final_test',
        email: 'final_test@nexus.com',
        displayName: 'Final Test User'
      }
    });
    console.log('✅ User created:', user.username, '(' + user.id + ')');
    
    // Create a post
    const post = await prisma.post.create({
      data: {
        title: 'Hello Nexus!',
        content: 'This is a test post with the new adapter',
        authorId: user.id,
        spaceId: 'test-space'
      }
    });
    console.log('✅ Post created:', post.title);
    
    // Create a comment
    const comment = await prisma.comment.create({
      data: {
        content: 'This is awesome!',
        authorId: user.id,
        postId: post.id
      }
    });
    console.log('✅ Comment created:', comment.content);
    
    // Query with relations
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        posts: true,
        comments: true
      }
    });
    console.log(`\n📊 User "${userData.displayName}" has ${userData.posts.length} post(s) and ${userData.comments.length} comment(s)`);
    
    // Clean up
    await prisma.comment.delete({ where: { id: comment.id } });
    await prisma.post.delete({ where: { id: post.id } });
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log('\n🎉 SUCCESS! Database is fully operational!');
    console.log('✅ NX-002 is complete and ready to close!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

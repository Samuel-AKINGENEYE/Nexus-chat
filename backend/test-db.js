const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔌 Testing database connection...\n');
  
  // Create a user
  const user = await prisma.user.create({
    data: {
      username: 'nexus_test',
      email: 'test@nexus.com',
      displayName: 'Nexus Test User'
    }
  });
  console.log('✅ User created:', user.username);
  
  // Create a post
  const post = await prisma.post.create({
    data: {
      title: 'Welcome to Nexus!',
      content: 'This is our first test post',
      authorId: user.id,
      spaceId: 'welcome-space'
    }
  });
  console.log('✅ Post created:', post.title);
  
  // Create a comment
  const comment = await prisma.comment.create({
    data: {
      content: 'Excited to be here!',
      authorId: user.id,
      postId: post.id
    }
  });
  console.log('✅ Comment created:', comment.content);
  
  // Fetch everything
  const posts = await prisma.post.findMany({
    include: { 
      author: true, 
      comments: true 
    }
  });
  console.log(`\n📊 Found ${posts.length} post(s) with their comments`);
  
  // Clean up
  await prisma.comment.delete({ where: { id: comment.id } });
  await prisma.post.delete({ where: { id: post.id } });
  await prisma.user.delete({ where: { id: user.id } });
  
  console.log('\n✅ All tests passed! Database is fully operational.');
  console.log('🎉 NX-002 is complete and ready to close!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

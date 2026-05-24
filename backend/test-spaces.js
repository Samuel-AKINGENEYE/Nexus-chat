const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nexus_dev?schema=public'
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testSpaceCreation() {
  console.log('🏠 Testing Space API...\n');
  
  try {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        username: 'space_creator',
        email: 'creator@nexus.com',
        displayName: 'Space Creator'
      }
    });
    console.log('✅ Test user created');
    
    // Create a space
    const space = await prisma.space.create({
      data: {
        name: 'Tech Talk',
        slug: 'tech-talk',
        description: 'A community for technology discussions',
        categoryTags: ['Technology', 'Programming'],
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
    console.log('✅ Space created:', space.name, `(${space.slug})`);
    
    // Test joining the space
    const secondUser = await prisma.user.create({
      data: {
        username: 'space_joiner',
        email: 'joiner@nexus.com',
        displayName: 'Space Joiner'
      }
    });
    console.log('✅ Second user created');
    
    const membership = await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: secondUser.id,
        role: 'CONTRIBUTOR'
      }
    });
    console.log('✅ User joined space');
    
    // Update member count
    await prisma.space.update({
      where: { id: space.id },
      data: { memberCount: { increment: 1 } }
    });
    
    // Fetch space with members
    const spaceWithMembers = await prisma.space.findUnique({
      where: { id: space.id },
      include: {
        creator: true,
        members: {
          include: { user: true }
        }
      }
    });
    console.log(`✅ Space has ${spaceWithMembers.members.length} member(s)`);
    
    // Clean up
    await prisma.spaceMember.deleteMany({ where: { spaceId: space.id } });
    await prisma.space.delete({ where: { id: space.id } });
    await prisma.user.delete({ where: { id: secondUser.id } });
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log('\n🎉 All space tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSpaceCreation();

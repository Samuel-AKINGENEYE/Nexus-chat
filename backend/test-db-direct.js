const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/nexus_dev?schema=public',
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database!');
    
    // Test create a user
    const user = await prisma.user.create({
      data: {
        username: 'direct_test',
        email: 'direct@test.com',
        displayName: 'Direct Test'
      }
    });
    console.log('✅ User created:', user.username);
    
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ User deleted');
    
    await prisma.$disconnect();
    console.log('🎉 All database tests passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();

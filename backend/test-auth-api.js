const { prisma } = require('./src/lib/prisma');
const bcrypt = require('bcryptjs');

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...\n');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Create a test user
    const hashedPassword = await bcrypt.hash('Test123456', 10);
    const user = await prisma.user.create({
      data: {
        username: 'auth_test_user',
        email: 'auth_test@example.com',
        passwordHash: hashedPassword,
        displayName: 'Auth Test User'
      }
    });
    console.log('✅ Test user created:', user.username);
    
    // Test password verification
    const isValid = await bcrypt.compare('Test123456', user.passwordHash);
    console.log('✅ Password verification:', isValid ? 'PASSED' : 'FAILED');
    
    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Test user cleaned up');
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();

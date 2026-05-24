const pushService = require('./src/services/pushNotificationService');

async function testPush() {
  console.log('📱 Testing Push Notification Service...\n');
  
  pushService.configure({ enabled: true });
  
  const result = await pushService.sendPushNotification(
    'test-user-1',
    'Test Notification',
    'This is a test push notification',
    { test: true }
  );
  
  console.log('✅ Push result:', result);
  
  const deviceResult = await pushService.registerDeviceToken(
    'test-user-1',
    'test-device-token-123',
    'android'
  );
  
  console.log('✅ Device registration:', deviceResult);
  console.log('\n🎉 Push notification service ready!');
}

testPush();

// Simple load testing script
const http = require('http');

async function makeRequest(endpoint, method = 'GET') {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: endpoint,
      method: method
    }, (res) => {
      const duration = Date.now() - start;
      resolve({ status: res.statusCode, duration });
    });
    req.on('error', () => resolve({ status: 500, duration: 0 }));
    req.end();
  });
}

async function runLoadTest() {
  console.log('🚀 Running load test...\n');
  
  const endpoints = ['/health', '/api/spaces', '/api/posts/space/test'];
  const iterations = 50;
  
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const endpoint = endpoints[i % endpoints.length];
    const result = await makeRequest(endpoint);
    results.push(result);
    
    if ((i + 1) % 10 === 0) {
      console.log(`Completed ${i + 1}/${iterations} requests`);
    }
  }
  
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const successRate = results.filter(r => r.status === 200).length / results.length * 100;
  
  console.log('\n📊 Load Test Results:');
  console.log(`   Average Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`   Total Requests: ${results.length}`);
}

runLoadTest();

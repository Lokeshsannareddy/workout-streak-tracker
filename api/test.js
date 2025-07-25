// /api/test.js
const axios = require('axios/dist/node/axios.cjs');

module.exports = async function handler(req, res) {
  const startTime = Date.now();
  console.log('🔧 TestEndpoint: Test endpoint called', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  try {
    console.log('🔧 TestEndpoint: Starting health checks');
    
    // Test if axios is working
    console.log('🔧 TestEndpoint: Testing axios functionality');
    const testResponse = await axios.get('https://httpbin.org/get', {
      timeout: 5000
    });
    console.log('🔧 TestEndpoint: Axios test successful', {
      status: testResponse.status,
      dataSize: JSON.stringify(testResponse.data).length
    });
    
    // Test environment variables
    console.log('🔧 TestEndpoint: Checking environment variables');
    const envCheck = {
      hasAxios: typeof axios !== 'undefined',
      nodeEnv: process.env.NODE_ENV,
      hasWhoopClientId: !!process.env.WHOOP_CLIENT_ID,
      hasWhoopClientSecret: !!process.env.WHOOP_CLIENT_SECRET,
      hasAppUrl: !!process.env.APP_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY
    };
    
    console.log('🔧 TestEndpoint: Environment check results', envCheck);
    
    // Test basic functionality
    console.log('🔧 TestEndpoint: Testing basic functionality');
    const basicTests = {
      canParseJSON: (() => {
        try {
          JSON.parse('{"test": "value"}');
          return true;
        } catch (e) {
          return false;
        }
      })(),
      canCreateDate: (() => {
        try {
          new Date().toISOString();
          return true;
        } catch (e) {
          return false;
        }
      })(),
      canUseFetch: typeof fetch !== 'undefined'
    };
    
    console.log('🔧 TestEndpoint: Basic functionality tests', basicTests);
    
    const responseTime = Date.now() - startTime;
    console.log('🔧 TestEndpoint: Test completed successfully', { responseTime });
    
    res.status(200).json({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      axiosWorking: true,
      testResponse: {
        status: testResponse.status,
        url: testResponse.config.url
      },
      environment: envCheck,
      basicTests,
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('🔧 TestEndpoint: Test failed', {
      error: error.message,
      stack: error.stack,
      responseTime,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: 'Test endpoint failed',
      error: error.message,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: {
        hasAxios: typeof axios !== 'undefined',
        nodeEnv: process.env.NODE_ENV,
        hasWhoopClientId: !!process.env.WHOOP_CLIENT_ID,
        hasWhoopClientSecret: !!process.env.WHOOP_CLIENT_SECRET,
        hasAppUrl: !!process.env.APP_URL
      }
    });
  }
} 
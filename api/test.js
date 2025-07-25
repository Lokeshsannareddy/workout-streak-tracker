// /api/test.js
import axios from 'axios';

export default async function handler(req, res) {
  try {
    console.log('Test endpoint called');
    
    // Test if axios is working
    const testResponse = await axios.get('https://httpbin.org/get');
    
    res.status(200).json({
      message: 'Test endpoint working',
      axiosWorking: true,
      testResponse: testResponse.data,
      environment: {
        hasAxios: typeof axios !== 'undefined',
        nodeEnv: process.env.NODE_ENV,
        hasWhoopClientId: !!process.env.WHOOP_CLIENT_ID,
        hasWhoopClientSecret: !!process.env.WHOOP_CLIENT_SECRET,
        hasAppUrl: !!process.env.APP_URL
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      message: 'Test endpoint failed',
      error: error.message,
      stack: error.stack
    });
  }
} 
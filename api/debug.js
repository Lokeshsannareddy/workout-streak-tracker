// /api/debug.js
const axios = require('axios/dist/node/axios.cjs');

module.exports = async function handler(req, res) {
  console.log('🔧 DebugEndpoint: Debug endpoint called', {
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Only allow GET requests for security
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasWhoopClientId: !!process.env.WHOOP_CLIENT_ID,
        hasWhoopClientSecret: !!process.env.WHOOP_CLIENT_SECRET,
        hasAppUrl: !!process.env.APP_URL,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
        appUrl: process.env.APP_URL || 'NOT_SET'
      },
      oauth: {
        clientId: process.env.WHOOP_CLIENT_ID ? `${process.env.WHOOP_CLIENT_ID.substring(0, 8)}...` : 'NOT_SET',
        redirectUri: process.env.APP_URL ? `${process.env.APP_URL}/api/oauthcallback` : 'NOT_SET',
        tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
        authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth'
      },
      endpoints: {
        oauthCallback: '/api/oauthcallback',
        webhookHandler: '/api/webhook-handler',
        test: '/api/test',
        health: '/api/health'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Test WHOOP API connectivity if credentials are available
    if (process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET) {
      try {
        console.log('🔧 DebugEndpoint: Testing WHOOP API connectivity');
        const response = await axios.get('https://api.prod.whoop.com/developer/v1/user/profile', {
          timeout: 5000,
          headers: {
            'Authorization': 'Bearer invalid_token_for_debug'
          }
        });
        debugInfo.whoopApiTest = {
          status: 'reachable',
          statusCode: response.status,
          note: 'API endpoint is reachable'
        };
      } catch (error) {
        if (error.response) {
          debugInfo.whoopApiTest = {
            status: 'reachable',
            statusCode: error.response.status,
            note: 'API is reachable (expected error with invalid token)',
            error: error.response.statusText
          };
        } else {
          debugInfo.whoopApiTest = {
            status: 'unreachable',
            error: error.message
          };
        }
      }
    } else {
      debugInfo.whoopApiTest = {
        status: 'skipped',
        reason: 'Missing WHOOP credentials'
      };
    }

    // Generate sample OAuth URL for testing
    if (process.env.WHOOP_CLIENT_ID && process.env.APP_URL) {
      const sampleState = 'debug_state_' + Date.now();
      const sampleOAuthUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${process.env.WHOOP_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.APP_URL + '/api/oauthcallback')}&scope=read:workout&response_type=code&state=${sampleState}`;
      
      debugInfo.sampleOAuthUrl = {
        url: sampleOAuthUrl,
        note: 'This is a sample OAuth URL for testing. Replace state parameter with a random value.',
        parameters: {
          client_id: process.env.WHOOP_CLIENT_ID,
          redirect_uri: process.env.APP_URL + '/api/oauthcallback',
          scope: 'read:workout',
          response_type: 'code',
          state: sampleState
        }
      };
    }

    console.log('🔧 DebugEndpoint: Debug information generated successfully');
    res.status(200).json(debugInfo);

  } catch (error) {
    console.error('🔧 DebugEndpoint: Error generating debug info', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Failed to generate debug information',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 
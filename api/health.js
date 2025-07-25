// /api/health.js
const axios = require('axios/dist/node/axios.cjs');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log('🔧 HealthCheck: Health check requested', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  const healthReport = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
    errors: []
  };

  try {
    // 1. Basic Environment Check
    console.log('🔧 HealthCheck: Checking environment variables');
    const envCheck = {
      hasWhoopClientId: !!process.env.WHOOP_CLIENT_ID,
      hasWhoopClientSecret: !!process.env.WHOOP_CLIENT_SECRET,
      hasAppUrl: !!process.env.APP_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV || 'development'
    };
    
    healthReport.checks.environment = {
      status: Object.values(envCheck).every(v => v !== undefined) ? 'healthy' : 'unhealthy',
      details: envCheck
    };

    // 2. Axios Check
    console.log('🔧 HealthCheck: Testing axios functionality');
    try {
      const axiosResponse = await axios.get('https://httpbin.org/get', { timeout: 5000 });
      healthReport.checks.axios = {
        status: 'healthy',
        responseTime: axiosResponse.headers['x-response-time'] || 'unknown',
        statusCode: axiosResponse.status
      };
    } catch (error) {
      healthReport.checks.axios = {
        status: 'unhealthy',
        error: error.message
      };
      healthReport.errors.push(`Axios test failed: ${error.message}`);
    }

    // 3. Supabase Connection Check
    console.log('🔧 HealthCheck: Testing Supabase connection');
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        const { data, error } = await supabase.from('workouts').select('count').limit(1);
        
        if (error) {
          healthReport.checks.supabase = {
            status: 'unhealthy',
            error: error.message
          };
          healthReport.errors.push(`Supabase connection failed: ${error.message}`);
        } else {
          healthReport.checks.supabase = {
            status: 'healthy',
            canQuery: true
          };
        }
      } catch (error) {
        healthReport.checks.supabase = {
          status: 'unhealthy',
          error: error.message
        };
        healthReport.errors.push(`Supabase test failed: ${error.message}`);
      }
    } else {
      healthReport.checks.supabase = {
        status: 'skipped',
        reason: 'Missing Supabase environment variables'
      };
    }

    // 4. WHOOP API Check (if credentials available)
    console.log('🔧 HealthCheck: Testing WHOOP API connectivity');
    if (process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET) {
      try {
        // Test WHOOP API endpoint (this will fail without a valid token, but we can check if the endpoint is reachable)
        const whoopResponse = await axios.get('https://api.prod.whoop.com/developer/v1/user/profile', {
          timeout: 5000,
          headers: {
            'Authorization': 'Bearer invalid_token_for_testing'
          }
        });
        healthReport.checks.whoopApi = {
          status: 'reachable',
          statusCode: whoopResponse.status
        };
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // 401 is expected with invalid token, but means the API is reachable
          healthReport.checks.whoopApi = {
            status: 'reachable',
            statusCode: error.response.status,
            note: 'API is reachable (401 expected with invalid token)'
          };
        } else {
          healthReport.checks.whoopApi = {
            status: 'unreachable',
            error: error.message
          };
          healthReport.errors.push(`WHOOP API test failed: ${error.message}`);
        }
      }
    } else {
      healthReport.checks.whoopApi = {
        status: 'skipped',
        reason: 'Missing WHOOP environment variables'
      };
    }

    // 5. System Resources Check
    console.log('🔧 HealthCheck: Checking system resources');
    const memoryUsage = process.memoryUsage();
    healthReport.checks.system = {
      status: 'healthy',
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      },
      uptime: `${Math.round(process.uptime())}s`
    };

    // Determine overall health status
    const unhealthyChecks = Object.values(healthReport.checks).filter(check => check.status === 'unhealthy');
    if (unhealthyChecks.length > 0) {
      healthReport.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    healthReport.responseTime = `${responseTime}ms`;
    
    console.log('🔧 HealthCheck: Health check completed', {
      status: healthReport.status,
      responseTime,
      errorCount: healthReport.errors.length
    });

    const statusCode = healthReport.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthReport);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('🔧 HealthCheck: Health check failed', {
      error: error.message,
      stack: error.stack,
      responseTime
    });

    healthReport.status = 'error';
    healthReport.errors.push(`Health check failed: ${error.message}`);
    healthReport.responseTime = `${responseTime}ms`;

    res.status(500).json(healthReport);
  }
} 
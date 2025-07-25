// /api/oauth-callback.js
const axios = require('axios/dist/node/axios.cjs');

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    console.log('🔧 OAuthCallback: OAuth callback received', { 
      query: req.query, 
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'referer': req.headers['referer'],
        'host': req.headers['host']
      },
      timestamp: new Date().toISOString()
    });
    
    // Get the authorization code and state from the query parameters
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors first
    if (error) {
      console.error('🔧 OAuthCallback: OAuth error received', {
        error,
        error_description,
        query: req.query
      });
      return res.status(400).send(`OAuth Error: ${error} - ${error_description || 'No description provided'}`);
    }

    if (!code) {
      console.error('🔧 OAuthCallback: No authorization code provided', { query: req.query });
      return res.status(400).send('Error: No authorization code provided.');
    }

    if (!state) {
      console.error('🔧 OAuthCallback: No state parameter provided', { query: req.query });
      return res.status(400).send('Error: No state parameter provided.');
    }

    console.log('🔧 OAuthCallback: Valid parameters received', {
      hasCode: !!code,
      codeLength: code.length,
      hasState: !!state,
      stateLength: state.length
    });

    // Your application's credentials from environment variables
    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    const appUrl = process.env.APP_URL;
    
    console.log('🔧 OAuthCallback: Environment variables check', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasAppUrl: !!appUrl,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      appUrl: appUrl || 'NOT_SET'
    });

    if (!clientId || !clientSecret || !appUrl) {
      console.error('🔧 OAuthCallback: Missing environment variables', { 
        clientId: !!clientId, 
        clientSecret: !!clientSecret, 
        appUrl: !!appUrl 
      });
      return res.status(500).send('Server configuration error: Missing environment variables.');
    }

    const redirectUri = `${appUrl}/api/oauthcallback`;
    const tokenUrl = 'https://api.prod.whoop.com/oauth/oauth2/token';

    console.log('🔧 OAuthCallback: Environment check', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret, 
      appUrl,
      redirectUri,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretLength: clientSecret ? clientSecret.length : 0
    });

    try {
      console.log('🔧 OAuthCallback: Attempting to exchange code for token');
      
      const tokenRequestData = {
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      };

      console.log('🔧 OAuthCallback: Token exchange request details', {
        tokenUrl,
        grantType: tokenRequestData.grant_type,
        codeLength: tokenRequestData.code.length,
        clientIdLength: tokenRequestData.client_id.length,
        redirectUri: tokenRequestData.redirect_uri
      });
      
      // Exchange the code for an access token
      // WHOOP expects URL-encoded form data, not JSON
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('code', code);
      formData.append('client_id', clientId);
      formData.append('client_secret', clientSecret);
      formData.append('redirect_uri', redirectUri);

      console.log('🔧 OAuthCallback: Sending form data', {
        grantType: formData.get('grant_type'),
        codeLength: formData.get('code').length,
        clientIdLength: formData.get('client_id').length,
        redirectUri: formData.get('redirect_uri')
      });

      const response = await axios.post(tokenUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('🔧 OAuthCallback: Token exchange successful', {
        status: response.status,
        statusText: response.statusText,
        hasAccessToken: !!response.data.access_token,
        accessTokenLength: response.data.access_token ? response.data.access_token.length : 0,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
        hasRefreshToken: !!response.data.refresh_token
      });
      
      const { access_token, token_type, expires_in, refresh_token } = response.data;

      // Validate the received token
      if (!access_token) {
        console.error('🔧 OAuthCallback: No access token in response', { responseData: response.data });
        return res.status(500).send('Error: No access token received from WHOOP.');
      }

      // Redirect the user back to the main page, passing the token and state in the URL hash.
      // The frontend will validate the state and grab the token from the hash, save it, and clean the URL.
      const redirectUrl = `${appUrl}#access_token=${access_token}&state=${state}`;
      console.log('🔧 OAuthCallback: Redirecting to frontend', { 
        redirectUrl: redirectUrl.substring(0, 100) + '...',
        state,
        tokenType,
        expiresIn
      });
      
      const responseTime = Date.now() - startTime;
      console.log('🔧 OAuthCallback: OAuth flow completed successfully', { responseTime });
      
      res.redirect(redirectUrl);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('🔧 OAuthCallback: Error exchanging authorization code', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : 'No response data',
        stack: error.stack,
        responseTime
      });
      
      // Provide more detailed error information
      let errorMessage = 'An error occurred during authentication.';
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = 'Invalid authorization code or redirect URI. Please try again.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please check your WHOOP credentials.';
        } else if (error.response.status === 500) {
          errorMessage = 'WHOOP server error. Please try again later.';
        }
      }
      
      res.status(500).send(`Authentication Error: ${errorMessage} Check server logs for details.`);
    }

  } catch (outerError) {
    const responseTime = Date.now() - startTime;
    console.error('🔧 OAuthCallback: Critical error in handler', {
      error: outerError.message,
      stack: outerError.stack,
      responseTime,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).send('Critical server error. Please check server logs.');
  }
}
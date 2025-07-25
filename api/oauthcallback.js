// /api/oauth-callback.js
import axios from 'axios';

export default async function handler(req, res) {
  console.log('OAuth callback received:', { query: req.query, method: req.method });
  
  // Get the authorization code and state from the query parameters
  const { code, state } = req.query;

  if (!code) {
    console.error('No authorization code provided');
    return res.status(400).send('Error: No authorization code provided.');
  }

  if (!state) {
    console.error('No state parameter provided');
    return res.status(400).send('Error: No state parameter provided.');
  }

  // Your application's credentials from environment variables
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;
  const redirectUri = `${appUrl}/api/oauthcallback`;
  const tokenUrl = 'https://api.prod.whoop.com/oauth/oauth2/token';

  console.log('Environment check:', { 
    hasClientId: !!clientId, 
    hasClientSecret: !!clientSecret, 
    appUrl,
    redirectUri 
  });

  if (!clientId || !clientSecret || !appUrl) {
    console.error('Missing environment variables:', { clientId: !!clientId, clientSecret: !!clientSecret, appUrl: !!appUrl });
    return res.status(500).send('Server configuration error: Missing environment variables.');
  }

  try {
    console.log('Attempting to exchange code for token...');
    
    // Exchange the code for an access token
    const response = await axios.post(tokenUrl, {
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Token exchange successful');
    const { access_token } = response.data;

    // Redirect the user back to the main page, passing the token and state in the URL hash.
    // The frontend will validate the state and grab the token from the hash, save it, and clean the URL.
    const redirectUrl = `${appUrl}#access_token=${access_token}&state=${state}`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error exchanging authorization code:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response data',
      stack: error.stack
    });
    
    res.status(500).send('An error occurred during authentication. Check server logs for details.');
  }
}
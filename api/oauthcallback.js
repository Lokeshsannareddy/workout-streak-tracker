// /api/oauth-callback.js
import axios from 'axios';

export default async function handler(req, res) {
  // Get the authorization code from the query parameters
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Error: No authorization code provided.');
  }

  // Your application's credentials from environment variables
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL}/api/oauth-callback`;
  const tokenUrl = 'https://api.prod.whoop.com/oauth/oauth2/token';

  try {
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

    const { access_token } = response.data;

    // Redirect the user back to the main page, passing the token in the URL hash.
    // The frontend will grab the token from the hash, save it, and clean the URL.
    res.redirect(`${process.env.APP_URL}#access_token=${access_token}`);

  } catch (error) {
    console.error('Error exchanging authorization code:', error.response ? error.response.data : error.message);
    res.status(500).send('An error occurred during authentication.');
  }
}
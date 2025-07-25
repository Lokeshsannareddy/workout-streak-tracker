// /api/webhook-handler.js
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // WHOOP requires a POST request for webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const payload = req.body;

  try {
    // Loop through each event in the webhook payload
    for (const event of payload) {
      // When you first create the webhook, WHOOP sends a test event
      if (event.type === 'webhook.test') {
        console.log('Received WHOOP webhook test event.');
      }

      // When a workout is created or updated
      if (event.type === 'workout.created' || event.type === 'workout.updated') {
        console.log(`Workout event received for user ${event.user_id}`);
        
        // Insert the relevant data into your Supabase table
        const { error } = await supabase
          .from('workouts')
          .insert({ 
            user_id: event.user_id, 
            workout_id: event.payload.id,
            strain: event.payload.score.strain 
          });

        if (error) {
          console.error('Supabase insert error:', error.message);
          // Don't block other events from processing
        } else {
          console.log(`Successfully logged workout ${event.payload.id} to Supabase.`);
        }
      }
    }
    
    // Respond to WHOOP with a success message
    res.status(200).json({ status: 'received' });

  } catch (err) {
    console.error('Error processing webhook:', err.message);
    res.status(500).json({ status: 'error' });
  }
}
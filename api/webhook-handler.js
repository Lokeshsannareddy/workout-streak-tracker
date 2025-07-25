// /api/webhook-handler.js
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  console.log('🔧 WebhookHandler: Received webhook request', {
    method: req.method,
    headers: req.headers,
    bodyLength: req.body ? Object.keys(req.body).length : 0,
    timestamp: new Date().toISOString()
  });

  // WHOOP requires a POST request for webhooks
  if (req.method !== 'POST') {
    console.log('🔧 WebhookHandler: Invalid method', { method: req.method });
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const payload = req.body;
  console.log('🔧 WebhookHandler: Processing webhook payload', {
    payloadType: typeof payload,
    isArray: Array.isArray(payload),
    eventCount: Array.isArray(payload) ? payload.length : 1
  });

  try {
    // Loop through each event in the webhook payload
    for (const event of payload) {
      console.log('🔧 WebhookHandler: Processing event', {
        eventType: event.type,
        userId: event.user_id,
        eventId: event.id,
        timestamp: event.timestamp
      });

      // When you first create the webhook, WHOOP sends a test event
      if (event.type === 'webhook.test') {
        console.log('🔧 WebhookHandler: Received WHOOP webhook test event');
        continue;
      }

      // When a workout is created or updated
      if (event.type === 'workout.created' || event.type === 'workout.updated') {
        console.log('🔧 WebhookHandler: Processing workout event', {
          eventType: event.type,
          userId: event.user_id,
          workoutId: event.payload?.id,
          strain: event.payload?.score?.strain,
          hasPayload: !!event.payload
        });
        
        if (!event.payload) {
          console.error('🔧 WebhookHandler: Missing payload in workout event');
          continue;
        }

        // Insert the relevant data into your Supabase table
        const workoutData = {
          user_id: event.user_id, 
          workout_id: event.payload.id,
          strain: event.payload.score?.strain || 0,
          event_type: event.type,
          created_at: new Date().toISOString()
        };

        console.log('🔧 WebhookHandler: Inserting workout data to Supabase', workoutData);

        const { data, error } = await supabase
          .from('workouts')
          .insert(workoutData);

        if (error) {
          console.error('🔧 WebhookHandler: Supabase insert error', {
            error: error.message,
            details: error.details,
            hint: error.hint,
            workoutData
          });
          // Don't block other events from processing
        } else {
          console.log('🔧 WebhookHandler: Successfully logged workout to Supabase', {
            workoutId: event.payload.id,
            insertedData: data,
            strain: event.payload.score?.strain
          });
        }
      } else {
        console.log('🔧 WebhookHandler: Unhandled event type', { eventType: event.type });
      }
    }
    
    console.log('🔧 WebhookHandler: Webhook processing completed successfully');
    // Respond to WHOOP with a success message
    res.status(200).json({ status: 'received' });

  } catch (err) {
    console.error('🔧 WebhookHandler: Error processing webhook', {
      error: err.message,
      stack: err.stack,
      payload: payload
    });
    res.status(500).json({ status: 'error', message: err.message });
  }
}
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// In-memory session store for conversational state
const sessions = new Map();

function normalizePhone(phone) {
  const value = String(phone || '').replace(/\D/g, '');
  if (value.startsWith('254')) return value;
  if (value.startsWith('0') && value.length === 10) return `254${value.slice(1)}`;
  return value;
}

// Helper to send WhatsApp messages back to the user
async function sendWhatsAppMessage(to, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: message }
    })
  });
  return response.json();
}

// 1. META WEBHOOK VERIFICATION
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  console.log('Verification failed');
  return res.sendStatus(403);
});

// 2. INCOMING WHATSAPP MESSAGES
app.post('/api/whatsapp/webhook', async (req, res) => {
  console.log('📞 Webhook POST received at:', new Date().toISOString());
  console.log('RAW META PAYLOAD:', JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const message of change?.value?.messages || []) {
          const from = normalizePhone(message?.from);
          const text = message?.text?.body?.trim().toLowerCase();
          
          console.log('Parsed FROM:', from, 'Parsed TEXT:', text);

          if (!from || !text) {
            console.log('Skipping payload: missing from or text');
            continue; 
          }

          // THIS IS THE LINE THAT WAS MISSING:
          let session = sessions.get(from) || { state: 'greeting' };

          // State Machine for Conversational Intake
          if (text === 'hi' || text === 'hello' || text === 'start') {
            session = { state: 'waste_type' };
            sessions.set(from, session);
            await sendWhatsAppMessage(from, "Welcome to Grow and Feeds Patrons.\n\nWhat type of organic waste do you have?\nReply with:\n1. fruit_veg\n2. crop_residue\n3. manure");
            continue;
          }

          if (session.state === 'waste_type') {
            if (['fruit_veg', 'crop_residue', 'manure'].includes(text)) {
              session.waste_type = text;
              session.state = 'volume';
              sessions.set(from, session);
              await sendWhatsAppMessage(from, `Great. You selected ${session.waste_type}.\n\nApproximately how many kilograms (kg) do you have? (Reply with a number, e.g., 50)`);
            } else {
              await sendWhatsAppMessage(from, "Please reply with exactly: fruit_veg, crop_residue, or manure.");
            }
            continue;
          }

          if (session.state === 'volume') {
            const volume = parseInt(text);
            if (isNaN(volume) || volume <= 0) {
              await sendWhatsAppMessage(from, "Please reply with a valid number greater than 0.");
              continue;
                        // ... existing if statements for 'waste_type' and 'volume' ...

          // ADD THIS FALLBACK FOR LOST SESSIONS:
          if (session.state === 'greeting' && text !== 'hi' && text !== 'hello' && text !== 'start') {
             await sendWhatsAppMessage(from, "It looks like our connection reset. Please send 'Hi' to start a new request.");
             continue;
          }
            }
            
            // Save to Supabase
            const { error } = await supabase.from('pickup_requests').insert({
              whatsapp_sender_phone: from,
              waste_type: session.waste_type,
              estimated_volume_kg: volume,
              status: 'pending'
            });

            if (error) {
              console.error('Supabase Error:', error);
              await sendWhatsAppMessage(from, "We could not save your request right now. Please try again later.");
            } else {
              await sendWhatsAppMessage(from, `Request Confirmed.\n\nType: ${session.waste_type}\nVolume: ${volume} kg\nStatus: Pending\n\nOur team will contact you shortly.`);
            }
            
            // Reset session
            sessions.delete(from);
            continue;
          }
        }
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).send('EVENT_RECEIVED');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Grow and Feeds Backend listening on port ${PORT}`);
});

Blocker 1: Render Free Tier Memory Exhaustion
Issue: Initial attempts to deploy n8n on Render resulted in repeated Ran out of memory (used over 512MB) crashes.
Root Cause: n8n is an enterprise-grade visual automation tool with a baseline memory footprint exceeding Render's 512MB free tier limit.
Resolution: Pivoted to a custom, lightweight Node.js/Express backend. This reduced the memory footprint to under 100MB, comfortably fitting within Render's free tier constraints.

Blocker 2: Meta Webhook Verification Failure
Issue: Manual webhook configuration in the Meta Developer Dashboard returned The callback URL or verify token couldn't be validated.
Root Cause: Make.com's native WhatsApp module abstracts the verification process, causing a conflict when attempting to manually paste the webhook URL and token into Meta's UI. Meta requires a specific GET request response (hub.challenge) that the manual UI flow could not satisfy.
Resolution: Implemented a dedicated app.get('/api/whatsapp/webhook', ...) route in the Express server. This explicitly listens for Meta's verification GET request, validates the token, and returns the challenge string, satisfying Meta's requirements instantly.

Blocker 3: In-Memory Session Volatility (Accepted MVP Limitation)
Issue: Conversational state is currently stored in a JavaScript Map (const sessions = new Map()).
Root Cause: Serverless or containerized environments like Render may restart or scale down, wiping the RAM and resetting active, incomplete user conversations.
Resolution: Documented this as a known MVP limitation in the README. The immediate workaround is instructing users to type "Hi" to restart the flow. The permanent solution (Next System Increment) is to persist session state in a dedicated Supabase whatsapp_sessions table.

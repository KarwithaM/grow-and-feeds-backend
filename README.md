# Grow and Feeds Backend

A lightweight Node.js/Express backend service for the Grow and Feeds Patrons agribusiness. It handles inbound WhatsApp messages, manages conversational state for organic waste pickup requests, and persists data to a Supabase PostgreSQL database.

## Architecture
- **Application:** Node.js + Express
- **Database:** Supabase PostgreSQL
- **Messaging:** Meta WhatsApp Cloud API
- **Hosting:** Render

## Local Setup
1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your credentials.
3. Run `npm install`.
4. Run `npm run dev` to start the server with hot reloading.

## Deployment
This service is designed to be deployed on Render as a Web Service.
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** Ensure all variables from `.env.example` are configured in the Render dashboard.

## Current Limitations (MVP)
- WhatsApp conversation state is held in application memory (`Map`). A Render restart will reset active, incomplete conversations. Users can recover by sending "Hi" again.
- Persistent session storage in Supabase is planned for the next system increment.

## Environment Variables
| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend database authentication |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification secret |
| `WHATSAPP_ACCESS_TOKEN` | Meta API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta business phone number ID |
| `PORT` | Render application port (defaults to 10000) |

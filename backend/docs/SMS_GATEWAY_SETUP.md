# SMS Gateway Setup

This backend supports two SMS ingestion paths and one outbound provider:

- Incoming:
  - Twilio webhook: POST /api/sms/webhook (form-encoded)
  - Android SMS Gateway (custom): POST /api/sms/webhook (JSON) with header `x-gateway-api-key`
- Outgoing:
  - Twilio Programmable SMS (or dev fallback logging when credentials are missing)

## Environment variables

Set these in `.env` (never commit secrets publicly):

- TWILIO_ACCOUNT_SID: Account SID
- TWILIO_AUTH_TOKEN: Auth token
- TWILIO_PHONE_NUMBER: E.164 phone number (e.g. +15074485995)
- SMS_GATEWAY_API_KEY: shared secret for your Android SMS Gateway app
- Optional for SMSSync (if used):
  - SMSSYNC_SECRET: shared secret for SMSSync

## Endpoints

- POST /api/sms/webhook
  - Twilio: content-type application/x-www-form-urlencoded, fields From, To, Body, MessageSid
  - Android Gateway: content-type application/json, header x-gateway-api-key, fields: { busId, latitude, longitude, speed?, heading?, timestamp?, from? } or message "GPS:..." / "BUS123:lat,lng"

- Authenticated routes (Bearer token):
  - POST /api/sms/test { phoneNumber, message? }
  - POST /api/sms/bulk-send { phoneNumbers: string[], message: string }
  - POST /api/sms/driver-instructions/:busId { driverPhone }
  - GET  /api/sms/health
  - GET  /api/sms/analytics

## Quick test (dev)

1) Start server and ensure .env has Twilio creds (or use dev fallback):

2) Webhook test (gateway JSON):

POST http://localhost:5000/api/sms/webhook
Headers: { "Content-Type": "application/json", "x-gateway-api-key": "<SMS_GATEWAY_API_KEY>" }
Body:
{
  "busId": "MH12AB1234",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "from": "+911234567890",
  "timestamp": "2025-09-21T12:00:00Z"
}

3) Passenger query via Twilio form-encoded (simulated):

POST http://localhost:5000/api/sms/webhook
Content-Type: application/x-www-form-urlencoded
Body: From=%2B911234567890&Body=STATUS%20MH12AB1234

4) Send a test outbound SMS (requires auth token):

POST http://localhost:5000/api/sms/test
Authorization: Bearer <JWT>
Body: { "phoneNumber": "+911234567890", "message": "Hello from MargSetu" }

## Notes

- In development without Twilio creds, messages are logged to console instead of sent.
- The passenger query parser supports: BUS, STATUS, ROUTE <id>, ROUTE <from> TO <to>, SCHEDULE <route>, NEAREST <place>, HELP.
- For Android client fallback SMS (device-sent), ensure android.permission.SEND_SMS is granted and a SIM is present.

# MargSetu

Smart, privacy‑aware public transport tracking for small cities. This monorepo contains:

- backend: Node.js/Express API for location, routes, buses, SMS, auth
- vercel-backend: Lightweight serverless endpoints for SMS/driver APIs
- driver-app: Android app (Kotlin) for drivers to report GPS/SMS
- passenger-app: Android app (Kotlin) for passengers to track buses
- sms-gateway: Android gateway app for SMS-based GPS fallback

## Key Features
- Real-time driver GPS updates via HTTP and SMS fallback
- Passenger queries via REST/SMS with address reverse‑geocoding
- Role-based auth (JWT), rate limiting, and basic analytics
- Vercel-hosted serverless endpoints for quick deployment

## Repository Structure
- backend/ — Node.js API (Express, MongoDB, Socket.IO)
- vercel-backend/ — Serverless endpoints + utils
- driver-app/ — Android driver application (Kotlin)
- passenger-app/ — Android passenger application (Kotlin)
- sms-gateway/ — Android SMS gateway application

## Tech Stack
- Backend: Node.js, Express, MongoDB (Mongoose), Socket.IO, Twilio
- Android: Kotlin, AndroidX, WorkManager, Foreground Services
- Hosting: Vercel (serverless), any Node host for backend

## Quick Start (Windows PowerShell)

1) Clone and open the repo
```powershell
cd "C:\Users\DELL\Desktop"
# Already cloned locally; repository remote is set to GitHub
cd "C:\Users\DELL\Desktop\Project MS"
```

2) Backend API (local)
```powershell
cd "C:\Users\DELL\Desktop\Project MS\backend"
copy .env.example .env
# Edit .env and set real values
npm install
npm run dev   # nodemon; or: npm start
```
The API defaults to port 5000. Configure `MONGODB_URI` in `.env`.

3) Vercel serverless API (optional)
```powershell
cd "C:\Users\DELL\Desktop\Project MS\vercel-backend"
npm install
vercel         # first-time linking/login
vercel --prod  # deploy to production
```

4) Android apps
- Open `driver-app/` and `passenger-app/` in Android Studio (Arctic/Flamingo+)
- Configure `local.properties` for your SDK path
- Build/Run on device or emulator

5) SMS Gateway
- Open `sms-gateway/android-app/` in Android Studio
- Build and install on an Android device with SMS capability

## Configuration
Create `backend/.env` (see `backend/.env.example`):
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/margsetu

# Auth
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Security & Secrets
- Do not commit `.env` files; they are gitignored.
- Twilio examples use masked placeholders to satisfy GitHub push protection.
- If any credential was previously committed anywhere, rotate it immediately.
- Android signing keys (`*.jks`/`*.keystore`) and APK/AAB artifacts are ignored.

## Scripts You May Find Handy
- Root helpers: `start-dev.ps1`, `build-and-test.bat`, `test-logs.bat`
- Backend: `npm run dev`, `npm start`, `npm run seed`
- Vercel: `vercel`, `vercel --prod`

## Contributing
- Create a feature branch from `main`
- Keep PRs focused; no secrets or large binaries
- Run local tests and lint before pushing

## License
Internal project; license to be clarified by the owner.

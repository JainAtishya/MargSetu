# MargSetu Vercel Backend

Serverless backend for MargSetu GPS tracking system deployed on Vercel.

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if the API is running

### Authentication
- **POST** `/api/auth/driver-login` - Driver login

### Location Tracking
- **POST** `/api/locations/update` - Update driver/bus location

## Deployment

### Quick Deploy
```bash
npm install -g vercel
cd vercel-backend
vercel --prod
```

### Environment Variables
Set these in Vercel Dashboard:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT tokens

## Usage Example

### Driver Login
```javascript
const response = await fetch('https://your-app.vercel.app/api/auth/driver-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'driver123',
    password: 'password123'
  })
});
```

### Location Update
```javascript
const response = await fetch('https://your-app.vercel.app/api/locations/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    driverId: 'driver123',
    latitude: 25.2048,
    longitude: 55.2708,
    timestamp: Date.now()
  })
});
```

## Features
- ✅ CORS enabled for all origins
- ✅ Rate limiting (6 requests/minute per driver)
- ✅ Input validation
- ✅ Error handling
- 🔄 Database integration (coming soon)
- 🔄 JWT authentication (coming soon)
- 🔄 GPS encryption (coming soon)
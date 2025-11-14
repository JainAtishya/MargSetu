const path = require('path');
const fs = require('fs');

// Load environment variables with fallback
function loadEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env file exists
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('✅ Environment variables loaded from .env file');
  } else {
    console.log('⚠️ .env file not found, using defaults');
  }

  // Set defaults for required environment variables
  const defaults = {
    NODE_ENV: 'development',
    PORT: '5000',
    JWT_SECRET: 'margsetu_jwt_secret_key_2025',
    JWT_EXPIRES_IN: '7d',
    BCRYPT_ROUNDS: '12',
    FRONTEND_URL: 'http://localhost:3000',
    API_VERSION: 'v1',
    MAX_UPLOAD_SIZE: '10mb',
    RATE_LIMIT_WINDOW: '15',
    RATE_LIMIT_MAX: '100'
  };

  // Apply defaults for missing environment variables
  Object.keys(defaults).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = defaults[key];
      console.log(`📝 Set default ${key}: ${defaults[key]}`);
    }
  });

  // Validate critical environment variables
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    // Safe local default for dev if not provided
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/margsetu';
      console.log('📝 Using local MongoDB URI fallback for development');
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: parseInt(process.env.PORT) || 5000,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    FRONTEND_URL: process.env.FRONTEND_URL,
    API_VERSION: process.env.API_VERSION,
    MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100
  };
}

module.exports = { loadEnvironment };
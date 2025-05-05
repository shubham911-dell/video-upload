// 1. Environment and Dependencies
require('dotenv').config({ debug: true });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 2. Initialize App
const app = express();

// 3. Middleware
app.use(cors());
app.use(express.json());

// Debug logs
console.log('Current directory:', process.cwd());
console.log('Trying to load .env from:', path.resolve('.env'));

// 4. MongoDB Video Schema
const videoSchema = new mongoose.Schema({
  filename: String,
  path: String,
  cloudinaryUrl: String,
  uploadDate: { type: Date, default: Date.now },
  size: Number,
  duration: Number
});
const Video = mongoose.model('Video', videoSchema);

// 5. Cloudinary Configuration
if (process.env.CLOUDINARY_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
  });
}

// 6. MongoDB Connection - UPDATED SECTION
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000 // Increased timeout
    });
    console.log('✅ Connected to MongoDB');
    
    // Connection event listeners
    mongoose.connection.on('connected', () => console.log('Mongoose connected'));
    mongoose.connection.on('error', (err) => console.error('Mongoose error:', err));
    mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));
    
  } catch (err) {
    console.error('❌ Critical MongoDB connection error:', err);
    process.exit(1); // Exit process on connection failure
  }
};

// Immediately invoke connection
connectDB();

// 7. Configure Static Files 
// ... (rest of your existing static files configuration remains the same)
// ... (keep all your existing multer, routes, and server setup)

// Health check endpoint - ENHANCED VERSION
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const cloudinaryStatus = process.env.CLOUDINARY_NAME ? 'configured' : 'not configured';
  
  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    services: {
      database: dbStatus,
      cloudinary: cloudinaryStatus,
      storage: fs.existsSync(uploadsPath) ? 'available' : 'unavailable',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// 10. Start Server - UPDATED WITH CONNECTION CHECK
const startServer = async () => {
  const PORT = process.env.PORT || 10000;
  
  // Only start server if MongoDB connection succeeds
  if (mongoose.connection.readyState === 1) {
    app.listen(PORT, () => {
      console.log(`
✅ Server running on port ${PORT}
📌 Upload endpoint: POST http://localhost:${PORT}/upload
📺 Video gallery: GET http://localhost:${PORT}/videos
📁 Local storage: ${uploadsPath}
🌐 Frontend: ${staticPath}
🔍 Environment: ${process.env.NODE_ENV || 'development'}
      `);
    });
  } else {
    console.error('⛔ Server not started - MongoDB connection failed');
    process.exit(1);
  }
};

// Delay server start to allow connection
setTimeout(startServer, 2000);
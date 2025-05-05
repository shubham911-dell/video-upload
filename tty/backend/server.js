// 1. Environment and Dependencies
require('dotenv').config({ debug: true });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Initialize __dirname for Windows compatibility

// 2. Initialize App
const app = express();

// 3. Middleware
app.use(cors());
app.use(express.json());

// Debug logs
console.log('Current directory:', __dirname);
console.log('Trying to load .env from:', path.join(__dirname, '.env'));

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

// 6. Path configurations
const staticPath = path.join(__dirname, '../../tty/frontend');
const uploadsPath = path.join(__dirname, 'public/uploads');

// Ensure directories exist
[uploadsPath].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// 7. MongoDB Connection
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not defined in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => console.log('Mongoose connected'));
mongoose.connection.on('error', (err) => console.error('Mongoose error:', err));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

// 8. Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 9. Serve static files
if (fs.existsSync(path.join(staticPath, 'index.html'))) {
  app.use(express.static(staticPath));
  console.log(`✅ Serving frontend from: ${staticPath}`);
} else {
  console.warn(`⚠️ Frontend not found at: ${staticPath}`);
}

// 10. Routes
app.get('/', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({
      status: 'running',
      message: 'Video Upload API is operational',
      endpoints: {
        upload: 'POST /upload',
        videos: 'GET /videos'
      }
    });
  }
});

// Upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let cloudinaryUrl, duration;
    if (process.env.CLOUDINARY_NAME) {
      const cloudResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "videos"
      });
      cloudinaryUrl = cloudResult.secure_url;
      duration = cloudResult.duration;
      fs.unlinkSync(req.file.path);
    }

    const video = new Video({
      filename: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      cloudinaryUrl,
      size: req.file.size,
      duration
    });

    await video.save();

    res.json({
      status: "success",
      video: {
        id: video._id,
        url: cloudinaryUrl || `/uploads/${req.file.filename}`,
        filename: video.filename,
        duration: video.duration
      }
    });

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ 
      error: "Upload failed",
      details: err.message
    });
  }
});

// Video endpoints
app.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ uploadDate: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cloudinary: process.env.CLOUDINARY_NAME ? 'configured' : 'not configured',
      storage: fs.existsSync(uploadsPath) ? 'available' : 'unavailable'
    }
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 10000;
  
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
};

startServer().catch(err => {
  console.error('⛔ Failed to start server:', err);
  process.exit(1);
});